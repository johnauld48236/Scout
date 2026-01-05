import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Get weekly review status for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('account_plans')
      .select('in_weekly_review, review_cadence, last_reviewed_at, last_reviewed_by')
      .eq('account_plan_id', id)
      .single()

    if (error || !account) {
      return Response.json({ error: 'Account not found' }, { status: 404 })
    }

    return Response.json(account)
  } catch (error) {
    console.error('Get weekly review error:', error)
    return Response.json({ error: 'Failed to get weekly review status' }, { status: 500 })
  }
}

// Toggle weekly review or update settings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { action, review_cadence } = body

    if (action === 'toggle') {
      // Get current status
      const { data: account } = await supabase
        .from('account_plans')
        .select('in_weekly_review')
        .eq('account_plan_id', id)
        .single()

      if (!account) {
        return Response.json({ error: 'Account not found' }, { status: 404 })
      }

      const newStatus = !account.in_weekly_review

      const { error } = await supabase
        .from('account_plans')
        .update({ in_weekly_review: newStatus })
        .eq('account_plan_id', id)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, in_weekly_review: newStatus })
    }

    if (action === 'mark_reviewed') {
      const { error } = await supabase
        .from('account_plans')
        .update({
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: body.reviewed_by || 'Unknown',
        })
        .eq('account_plan_id', id)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, last_reviewed_at: new Date().toISOString() })
    }

    if (action === 'update_cadence' && review_cadence) {
      const { error } = await supabase
        .from('account_plans')
        .update({ review_cadence })
        .eq('account_plan_id', id)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, review_cadence })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Weekly review update error:', error)
    return Response.json({ error: 'Failed to update weekly review' }, { status: 500 })
  }
}
