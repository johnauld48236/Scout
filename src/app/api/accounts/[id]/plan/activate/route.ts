import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('account_plans')
    .update({
      plan_status: 'active',
      planning_period_start: body.planning_period_start,
      planning_period_end: body.planning_period_end,
      activated_at: new Date().toISOString(),
    })
    .eq('account_plan_id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
