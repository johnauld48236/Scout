import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WizardData } from '@/components/wizard/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const wizardData: WizardData = await request.json()

    // Prepare research findings (limit size to avoid timeout)
    const acceptedFindings = wizardData.researchFindings
      .filter(f => f.status === 'accepted' || f.status === 'edited')
      .slice(0, 20) // Limit to 20 findings
      .map((f, index) => ({
        id: f.id || `finding-${Date.now()}-${index}`,
        category: f.category,
        title: f.title?.slice(0, 200),
        content: (f.editedContent || f.content)?.slice(0, 1000),
        confidence: f.confidence,
        status: f.status, // Preserve status for planning
      }))

    // 1. Create the account plan
    const insertData: Record<string, unknown> = {
      account_name: wizardData.accountName,
      website: wizardData.website?.slice(0, 255),
      industry: wizardData.industry?.slice(0, 255),
      employee_count: wizardData.employeeCount?.slice(0, 100),
      headquarters: wizardData.headquarters?.slice(0, 255),
      description: wizardData.description?.slice(0, 2000),
      strategic_objectives: wizardData.keyObjectives?.join('\n')?.slice(0, 2000),
      risk_factors: wizardData.riskFactors?.join('\n')?.slice(0, 2000),
      account_strategy: wizardData.accountStrategy?.slice(0, 5000),
      research_summary: wizardData.researchSummary?.slice(0, 2000),
      research_findings: acceptedFindings,
    }

    // Add TAM linkage if coming from TAM promotion
    if (wizardData.tamAccountId) {
      insertData.tam_account_id = wizardData.tamAccountId
    }
    if (wizardData.campaignId) {
      insertData.campaign_id = wizardData.campaignId
    }

    const { data: accountPlan, error: accountError } = await supabase
      .from('account_plans')
      .insert(insertData)
      .select('account_plan_id')
      .single()

    if (accountError) {
      console.error('Error creating account plan:', accountError)
      return Response.json({ error: 'Failed to create account plan' }, { status: 500 })
    }

    const accountPlanId = accountPlan.account_plan_id

    // If promoted from TAM, update TAM account status and import contacts
    if (wizardData.tamAccountId) {
      // Update TAM account status to Converted
      await supabase
        .from('tam_accounts')
        .update({
          status: 'Converted',
          promoted_to_account_plan_id: accountPlanId,
          promoted_at: new Date().toISOString(),
        })
        .eq('tam_account_id', wizardData.tamAccountId)

      // Import TAM contacts as stakeholders (before wizard stakeholders)
      const { data: tamContacts } = await supabase
        .from('tam_contacts')
        .select('*')
        .eq('tam_account_id', wizardData.tamAccountId)

      if (tamContacts && tamContacts.length > 0) {
        const importedStakeholders = tamContacts.map(c => ({
          account_plan_id: accountPlanId,
          full_name: c.full_name,
          title: c.title,
          email: c.email,
          phone: c.phone,
          linkedin_url: c.linkedin_url,
          profile_notes: c.notes,
          role_type: 'Other', // Default, user can update later
        }))

        await supabase.from('stakeholders').insert(importedStakeholders)
      }
    }

    // 2. Create stakeholders (from wizard - may overlap with imported TAM contacts)
    if (wizardData.stakeholders.length > 0) {
      const stakeholdersToInsert = wizardData.stakeholders
        .filter(s => s.full_name || s.title) // Only insert if has name or title
        .map(s => ({
          account_plan_id: accountPlanId,
          full_name: s.full_name || `${s.title} (TBD)`,
          title: s.title,
          email: s.email,
          linkedin_url: s.linkedin_url,
          role_type: s.role_type,
          sentiment: s.sentiment,
          notes: s.notes,
        }))

      if (stakeholdersToInsert.length > 0) {
        const { error: stakeholderError } = await supabase
          .from('stakeholders')
          .insert(stakeholdersToInsert)

        if (stakeholderError) {
          console.error('Error creating stakeholders:', stakeholderError)
          // Continue anyway - account plan was created
        }
      }
    }

    // 3. Create pursuits
    if (wizardData.pursuits.length > 0) {
      const pursuitsToInsert = wizardData.pursuits.map(p => ({
        account_plan_id: accountPlanId,
        name: p.name,
        description: p.description,
        estimated_value: p.estimated_value,
        stage: p.stage,
        notes: p.notes,
      }))

      const { error: pursuitError } = await supabase
        .from('pursuits')
        .insert(pursuitsToInsert)

      if (pursuitError) {
        console.error('Error creating pursuits:', pursuitError)
        // Continue anyway
      }
    }

    // 4. Create action items
    if (wizardData.actionItems.length > 0) {
      const actionsToInsert = wizardData.actionItems.map(a => ({
        account_plan_id: accountPlanId,
        title: a.title,
        description: a.description,
        owner: a.owner,
        due_date: a.due_date || null,
        priority: a.priority,
        category: a.category,
        status: 'Not Started',
      }))

      const { error: actionError } = await supabase
        .from('action_items')
        .insert(actionsToInsert)

      if (actionError) {
        console.error('Error creating action items:', actionError)
        // Continue anyway
      }
    }

    // 5. Store competitors (if we have a competitors field in account_plans)
    // For now, store in notes or a JSON field
    if (wizardData.competitors.length > 0) {
      const { error: updateError } = await supabase
        .from('account_plans')
        .update({
          competitors: wizardData.competitors.map(c => ({
            name: c.name,
            status: c.status,
            strengths: c.strengths,
            weaknesses: c.weaknesses,
            strategy: c.strategy,
          })),
        })
        .eq('account_plan_id', accountPlanId)

      if (updateError) {
        console.error('Error updating competitors:', updateError)
        // Continue anyway
      }
    }

    return Response.json({
      success: true,
      accountPlanId,
    })
  } catch (error) {
    console.error('Wizard API error:', error)
    return Response.json({ error: 'Failed to create account plan' }, { status: 500 })
  }
}
