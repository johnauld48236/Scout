import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - Fetch single account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('account_plans')
      .select('*')
      .eq('account_plan_id', id)
      .single()

    if (error) {
      console.error('Error fetching account:', error)
      return Response.json({ error: 'Failed to fetch account' }, { status: 500 })
    }

    if (!data) {
      return Response.json({ error: 'Account not found' }, { status: 404 })
    }

    return Response.json({ success: true, data })
  } catch (error) {
    console.error('Fetch API error:', error)
    return Response.json({ error: 'Failed to fetch account' }, { status: 500 })
  }
}

// PATCH - Update account fields (including owner assignments)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Allowed fields to update
    const allowedFields = [
      'sales_rep',
      'technical_am',
      'account_name',
      'industry',
      'vertical',
      'account_type',
      'employee_count',
      'headquarters',
      'website',
      'account_strategy',
      // Enrichment fields
      'corporate_structure',
      'enrichment_status',
      'last_enriched_at',
      'enrichment_source',
      // Intelligence fields
      'account_thesis',
      'campaign_ids',
      'compelling_events',
      'buying_signals',
    ]

    // Filter to only allowed fields
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('account_plans')
      .update(updateData)
      .eq('account_plan_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating account:', error)
      return Response.json({ error: 'Failed to update account' }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error) {
    console.error('Update API error:', error)
    return Response.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // First, get the account plan to check if it's linked to a TAM account
    const { data: accountPlan } = await supabase
      .from('account_plans')
      .select('tam_account_id')
      .eq('account_plan_id', id)
      .single()

    // Delete related records first (due to foreign key constraints)
    await Promise.all([
      supabase.from('action_items').delete().eq('account_plan_id', id),
      supabase.from('stakeholders').delete().eq('account_plan_id', id),
      supabase.from('account_signals').delete().eq('account_plan_id', id),
      supabase.from('account_divisions').delete().eq('account_plan_id', id),
    ])

    // Delete pursuits (need to delete BANT analyses first)
    const { data: pursuits } = await supabase
      .from('pursuits')
      .select('pursuit_id')
      .eq('account_plan_id', id)

    if (pursuits && pursuits.length > 0) {
      const pursuitIds = pursuits.map(p => p.pursuit_id)
      await supabase.from('bant_analyses').delete().in('pursuit_id', pursuitIds)
      await supabase.from('pursuits').delete().eq('account_plan_id', id)
    }

    // Delete the account plan
    const { error } = await supabase
      .from('account_plans')
      .delete()
      .eq('account_plan_id', id)

    if (error) {
      console.error('Error deleting account plan:', error)
      return Response.json({ error: 'Failed to delete account plan' }, { status: 500 })
    }

    // If linked to TAM account, reset the TAM account status so it shows back in TAM list
    if (accountPlan?.tam_account_id) {
      await supabase
        .from('tam_accounts')
        .update({
          status: 'Qualified',
          promoted_to_account_plan_id: null,
          promoted_at: null,
        })
        .eq('tam_account_id', accountPlan.tam_account_id)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete API error:', error)
    return Response.json({ error: 'Failed to delete account plan' }, { status: 500 })
  }
}
