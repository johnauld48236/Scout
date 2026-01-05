import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/accounts/[id]/intelligence - Get account intelligence data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('account_plans')
      .select('compelling_events, buying_signals, account_thesis')
      .eq('account_plan_id', id)
      .single()

    if (error) {
      console.error('Error fetching intelligence:', error)
      return Response.json({ error: 'Failed to fetch intelligence' }, { status: 500 })
    }

    return Response.json({
      compelling_events: account?.compelling_events || [],
      buying_signals: account?.buying_signals || [],
      account_thesis: account?.account_thesis || null,
    })
  } catch (error) {
    console.error('Intelligence API error:', error)
    return Response.json({ error: 'Failed to fetch intelligence' }, { status: 500 })
  }
}
