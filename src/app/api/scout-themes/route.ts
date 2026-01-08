import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const accountPlanId = searchParams.get('account_plan_id')
  const vector = searchParams.get('vector') // 'out' for Trails, 'in' for Missions

  if (!accountPlanId) {
    return NextResponse.json({ error: 'account_plan_id required' }, { status: 400 })
  }

  let query = supabase
    .from('scout_themes')
    .select('*')
    .eq('account_plan_id', accountPlanId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })

  // Filter by vector if specified
  if (vector) {
    query = query.eq('vector', vector)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching scout themes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const {
    account_plan_id,
    title,
    description,
    why_it_matters,
    size,
    health_impact,  // For Missions: 'high', 'medium', 'low'
    vector,         // 'out' for Trails, 'in' for Missions
    signals_connected,
    questions_to_explore
  } = body

  if (!account_plan_id || !title) {
    return NextResponse.json({ error: 'account_plan_id and title required' }, { status: 400 })
  }

  const insertData: Record<string, unknown> = {
    account_plan_id,
    title,
    description,
    why_it_matters,
    size: size || 'medium',
    signals_connected: signals_connected || [],
    questions_to_explore: questions_to_explore || [],
    status: 'exploring',
  }

  // Add optional fields if provided
  if (vector) insertData.vector = vector
  if (health_impact) insertData.health_impact = health_impact

  const { data, error } = await supabase
    .from('scout_themes')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating scout theme:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
