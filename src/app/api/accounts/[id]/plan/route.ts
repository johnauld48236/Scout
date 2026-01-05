import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: account, error } = await supabase
    .from('account_plans')
    .select(`
      *,
      stakeholders (*),
      pursuits (*),
      action_items (*)
    `)
    .eq('account_plan_id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(account)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  // Only update planning-related fields
  const updates: Record<string, unknown> = {}

  if (body.business_units !== undefined) {
    updates.business_units = body.business_units
  }
  if (body.signal_mappings !== undefined) {
    updates.signal_mappings = body.signal_mappings
  }
  if (body.milestones !== undefined) {
    updates.milestones = body.milestones
  }
  if (body.plan_completeness !== undefined) {
    updates.plan_completeness = body.plan_completeness
  }
  if (body.plan_status !== undefined) {
    updates.plan_status = body.plan_status
  }
  if (body.planning_period_start !== undefined) {
    updates.planning_period_start = body.planning_period_start
  }
  if (body.planning_period_end !== undefined) {
    updates.planning_period_end = body.planning_period_end
  }

  const { data, error } = await supabase
    .from('account_plans')
    .update(updates)
    .eq('account_plan_id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
