import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Toggle favorite status for an account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current status
    const { data: account } = await supabase
      .from('account_plans')
      .select('is_favorite')
      .eq('account_plan_id', id)
      .single()

    if (!account) {
      return Response.json({ error: 'Account not found' }, { status: 404 })
    }

    // Toggle
    const newStatus = !account.is_favorite

    const { error } = await supabase
      .from('account_plans')
      .update({ is_favorite: newStatus })
      .eq('account_plan_id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, is_favorite: newStatus })
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return Response.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}
