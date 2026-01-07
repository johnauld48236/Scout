import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

// Educational AI system prompt - helps reps LEARN, not prescribe
const SYSTEM_PROMPT = `You are helping a sales rep explore opportunity themes for an account. Your job is EDUCATIONAL - help them understand the account deeply, not prescribe what to sell.

CONTEXT PROVIDED:
- Account details (company, vertical, thesis)
- Signals (news, events, buying signals)
- Stakeholders (names, titles, influence)
- Existing intelligence

YOUR RESPONSE SHOULD:
1. Summarize key signals you see
2. Identify relevant stakeholders
3. Suggest 2-4 THEMES worth exploring
4. For each theme:
   - Explain WHY it matters based on signals
   - Suggest 2-3 QUESTIONS the rep should explore
   - Indicate potential size (high/medium/low) based on signal strength

THEMES ARE NOT DEALS. They are hypotheses to investigate.

DO NOT:
- Assign dollar values
- Prescribe specific products to sell
- Create action plans (that comes later)

DO:
- Connect dots between signals
- Raise questions that help the rep learn
- Be specific about what makes each theme interesting

IMPORTANT: Always respond with valid JSON matching the expected format.`

interface Signal {
  signal_id: string
  summary: string
  title?: string
  signal_type?: string
  signal_date?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  influence_level?: string
}

interface ExploreThemesRequest {
  account_plan_id: string
  user_message?: string
  conversation_history?: Array<{ role: string; content: string }>
}

interface ThemeSuggestion {
  title: string
  description: string
  why_it_matters: string
  questions: string[]
  suggested_size: 'high' | 'medium' | 'low'
  connected_signals: string[]
}

interface ExploreThemesResponse {
  signals_summary: string[]
  relevant_stakeholders: Array<{ name: string; title: string; relevance: string }>
  themes: ThemeSuggestion[]
  follow_up_response?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ExploreThemesRequest = await request.json()
    const { account_plan_id, user_message, conversation_history = [] } = body

    if (!account_plan_id) {
      return NextResponse.json({ error: 'account_plan_id required' }, { status: 400 })
    }

    // Fetch account context
    const supabase = await createClient()

    // Get account plan with related data
    const { data: accountPlan, error: planError } = await supabase
      .from('account_plans')
      .select(`
        *,
        tam_accounts (
          company_name,
          website,
          industry,
          employee_count,
          annual_revenue,
          headquarters_city,
          headquarters_country
        )
      `)
      .eq('account_plan_id', account_plan_id)
      .single()

    if (planError || !accountPlan) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get signals
    const { data: signals } = await supabase
      .from('account_signals')
      .select('signal_id, summary, title, signal_type, signal_date')
      .eq('account_plan_id', account_plan_id)
      .order('signal_date', { ascending: false })
      .limit(15)

    // Get stakeholders
    const { data: stakeholders } = await supabase
      .from('prospect_contacts')
      .select('stakeholder_id, full_name, title, influence_level')
      .eq('account_plan_id', account_plan_id)
      .limit(20)

    // Get existing themes for context
    const { data: existingThemes } = await supabase
      .from('scout_themes')
      .select('title, status')
      .eq('account_plan_id', account_plan_id)
      .neq('status', 'dismissed')

    // Build context for AI
    const accountContext = {
      company_name: accountPlan.tam_accounts?.company_name || accountPlan.account_name || 'Unknown',
      industry: accountPlan.tam_accounts?.industry || accountPlan.vertical,
      website: accountPlan.tam_accounts?.website,
      employee_count: accountPlan.tam_accounts?.employee_count,
      thesis: accountPlan.account_thesis,
      signals: (signals || []).map((s: Signal) => ({
        summary: s.summary,
        title: s.title,
        type: s.signal_type,
        date: s.signal_date,
      })),
      stakeholders: (stakeholders || []).map((s: Stakeholder) => ({
        name: s.full_name,
        title: s.title,
        influence: s.influence_level,
      })),
      existing_themes: existingThemes?.map(t => t.title) || [],
    }

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history
    for (const msg of conversation_history) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }

    // Add current user message or initial exploration request
    const userContent = user_message
      ? `User follow-up question: ${user_message}\n\nContinue the analysis based on this question while maintaining the educational focus.`
      : `Analyze this account and suggest opportunity themes to explore.

Account Context:
${JSON.stringify(accountContext, null, 2)}

Please respond with a JSON object in this exact format:
{
  "signals_summary": ["summary point 1", "summary point 2"],
  "relevant_stakeholders": [
    {"name": "Name", "title": "Title", "relevance": "Why they matter"}
  ],
  "themes": [
    {
      "title": "Theme Title",
      "description": "What this theme is about",
      "why_it_matters": "Why this is worth exploring based on signals",
      "questions": ["Question 1", "Question 2"],
      "suggested_size": "high" | "medium" | "low",
      "connected_signals": ["Summary of connected signal"]
    }
  ],
  "follow_up_response": null
}`

    messages.push({
      role: 'user',
      content: userContent,
    })

    // Call Claude API
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages,
    })

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response generated' }, { status: 500 })
    }

    // Parse JSON response
    let parsedResponse: ExploreThemesResponse
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        // If no JSON, create a conversational response
        parsedResponse = {
          signals_summary: [],
          relevant_stakeholders: [],
          themes: [],
          follow_up_response: textContent.text,
        }
      }
    } catch {
      // If parsing fails, return as conversational response
      parsedResponse = {
        signals_summary: [],
        relevant_stakeholders: [],
        themes: [],
        follow_up_response: textContent.text,
      }
    }

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error('Explore themes error:', error)
    return NextResponse.json(
      { error: 'Failed to explore themes' },
      { status: 500 }
    )
  }
}
