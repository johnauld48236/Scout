import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const client = new Anthropic()

export interface ExtractedItem {
  id: string
  type: 'action_item' | 'risk' | 'customer_request' | 'signal' | 'stakeholder_update'
  text: string
  suggested_priority?: 'high' | 'medium' | 'low'
  suggested_severity?: 'critical' | 'high' | 'medium' | 'low'
  category?: string
  stakeholder_name?: string
  stakeholder_title?: string
}

interface ExtractedData {
  items: ExtractedItem[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const { notes } = await request.json()

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return Response.json({ error: 'No notes provided' }, { status: 400 })
    }

    // Fetch account context
    const supabase = await createClient()
    const { data: account } = await supabase
      .from('account_plans')
      .select('account_name, industry')
      .eq('account_plan_id', accountId)
      .single()

    const accountContext = account
      ? `Account: ${account.account_name}${account.industry ? ` (${account.industry})` : ''}`
      : 'Account context unavailable'

    const systemPrompt = `You are an expert at extracting actionable items from sales meeting notes, call transcripts, and email summaries.

Context: ${accountContext}

Your job is to parse the provided notes and extract items that need attention or follow-up. Categorize each item as one of:

1. action_item - Tasks that need to be done (follow-ups, deliverables, commitments)
2. risk - Potential threats to the deal or relationship (competitor mentions, budget concerns, timeline issues, stakeholder changes)
3. customer_request - Feature requests, documentation needs, integration requirements, or any ask from the customer
4. signal - Market intelligence, org changes, strategic insights, buying signals, or important news
5. stakeholder_update - New contacts mentioned, role changes, or relationship updates

For each item, extract:
- type: One of the 5 categories above
- text: A clear, concise description of the item (1-2 sentences max)
- suggested_priority: For action_item and customer_request (high, medium, low)
- suggested_severity: For risk (critical, high, medium, low)
- category: For signal (org_change, competitor, budget, timeline, expansion, executive_change, other)
- stakeholder_name: For stakeholder_update (the person's name)
- stakeholder_title: For stakeholder_update (their role/title if mentioned)

Return ONLY valid JSON in this exact format:
{
  "items": [
    {"type": "action_item", "text": "Follow up on SSO implementation timeline", "suggested_priority": "high"},
    {"type": "risk", "text": "Customer mentioned competitor demo scheduled for next week", "suggested_severity": "medium"},
    {"type": "customer_request", "text": "Wants API documentation for BOM module", "suggested_priority": "medium"},
    {"type": "signal", "text": "New VP of Engineering starting next month", "category": "org_change"},
    {"type": "stakeholder_update", "text": "Sarah Chen promoted to Director of IT", "stakeholder_name": "Sarah Chen", "stakeholder_title": "Director of IT"}
  ]
}

Important rules:
- Only extract items clearly mentioned or strongly implied in the notes
- Don't invent or assume items not in the source material
- Keep text concise and actionable
- Prioritize quality over quantity - only include genuinely actionable/notable items
- If notes are unclear or lack actionable content, return fewer items rather than guessing`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Extract actionable items from these meeting notes:\n\n${notes}`
        }
      ],
      system: systemPrompt,
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse the JSON response
    let parsed: ExtractedData
    try {
      let jsonStr = textContent.text
      // Handle markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      parsed = JSON.parse(jsonStr.trim())
    } catch (e) {
      console.error('Failed to parse AI response:', textContent.text)
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Add unique IDs to each item
    const itemsWithIds = parsed.items.map((item, index) => ({
      ...item,
      id: `import-${Date.now()}-${index}`,
    }))

    return Response.json({ items: itemsWithIds })
  } catch (error) {
    console.error('Import notes error:', error)
    return Response.json({ error: 'Failed to process notes' }, { status: 500 })
  }
}

// POST endpoint to save selected items
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const { items } = await request.json() as { items: ExtractedItem[] }

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'No items provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const results = {
      action_items: 0,
      risks: 0,
      customer_requests: 0,
      signals: 0,
      stakeholder_updates: 0,
    }

    for (const item of items) {
      switch (item.type) {
        case 'action_item':
          const { error: actionError } = await supabase
            .from('action_items')
            .insert({
              account_plan_id: accountId,
              title: item.text,
              priority: item.suggested_priority || 'medium',
              status: 'pending',
              bucket: '30', // Default to 30-day bucket
              needs_review: false, // Auto-accept imported items for immediate allocation
            })
          if (!actionError) results.action_items++
          break

        case 'risk':
          const { error: riskError } = await supabase
            .from('risks')
            .insert({
              account_plan_id: accountId,
              title: item.text,
              severity: item.suggested_severity || 'medium',
              status: 'open',
              needs_review: false, // Auto-accept imported items for immediate allocation
            })
          if (!riskError) results.risks++
          break

        case 'customer_request':
          // Store in pain_points with a flag or in a dedicated table
          const { error: requestError } = await supabase
            .from('pain_points')
            .insert({
              account_plan_id: accountId,
              title: item.text,
              severity: item.suggested_priority === 'high' ? 'critical' :
                       item.suggested_priority === 'medium' ? 'moderate' : 'minor',
              needs_review: false, // Auto-accept imported items for immediate allocation
            })
          if (!requestError) results.customer_requests++
          break

        case 'signal':
          const { error: signalError } = await supabase
            .from('account_signals')
            .insert({
              account_plan_id: accountId,
              title: item.text,
              signal_type: item.category || 'general',
              signal_date: new Date().toISOString(),
              source: 'meeting_notes',
            })
          if (!signalError) results.signals++
          break

        case 'stakeholder_update':
          // These are flagged for manual review rather than auto-creating
          results.stakeholder_updates++
          break
      }
    }

    // Trigger health score recalculation after import
    try {
      const baseUrl = request.headers.get('origin') || request.headers.get('host') || ''
      const protocol = baseUrl.startsWith('localhost') ? 'http' : 'https'
      const healthUrl = baseUrl.startsWith('http')
        ? `${baseUrl}/api/accounts/${accountId}/health`
        : `${protocol}://${baseUrl}/api/accounts/${accountId}/health`

      await fetch(healthUrl, { method: 'POST' })
    } catch (healthError) {
      console.error('Failed to recalculate health after import:', healthError)
      // Don't fail the import if health calc fails
    }

    return Response.json({
      success: true,
      imported: results,
      message: `Imported ${results.action_items} actions, ${results.risks} risks, ${results.customer_requests} requests, ${results.signals} signals`
    })
  } catch (error) {
    console.error('Save imported items error:', error)
    return Response.json({ error: 'Failed to save items' }, { status: 500 })
  }
}
