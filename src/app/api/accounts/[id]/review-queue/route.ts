import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get all items needing review for this account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Fetch risks needing review
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*')
      .eq('account_plan_id', id)
      .eq('needs_review', true)
      .order('created_at', { ascending: false })

    if (risksError) {
      console.error('Risks fetch error:', risksError)
    }

    // Fetch pain points needing review
    const { data: painPoints, error: painPointsError } = await supabase
      .from('pain_points')
      .select('*')
      .eq('account_plan_id', id)
      .eq('needs_review', true)
      .order('created_at', { ascending: false })

    if (painPointsError) {
      console.error('Pain points fetch error:', painPointsError)
    }

    // Fetch action items needing review
    const { data: actions, error: actionsError } = await supabase
      .from('action_items')
      .select('*')
      .eq('account_plan_id', id)
      .eq('needs_review', true)
      .order('created_at', { ascending: false })

    if (actionsError) {
      console.error('Actions fetch error:', actionsError)
    }

    // Get import batches for grouping
    const { data: batches } = await supabase
      .from('import_batches')
      .select('*')
      .eq('account_plan_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      risks: risks || [],
      painPoints: painPoints || [],
      actions: actions || [],
      batches: batches || [],
      totalCount: (risks?.length || 0) + (painPoints?.length || 0) + (actions?.length || 0),
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    )
  }
}
