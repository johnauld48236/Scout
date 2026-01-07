import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const accountPlanId = searchParams.get('account_plan_id')

  if (!accountPlanId) {
    return NextResponse.json({ error: 'account_plan_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('scout_themes')
    .select('*')
    .eq('account_plan_id', accountPlanId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching scout themes:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { account_plan_id, title, description, why_it_matters, size, signals_connected, questions_to_explore } = body

  if (!account_plan_id || !title) {
    return NextResponse.json({ error: 'account_plan_id and title required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('scout_themes')
    .insert({
      account_plan_id,
      title,
      description,
      why_it_matters,
      size: size || 'medium',
      signals_connected: signals_connected || [],
      questions_to_explore: questions_to_explore || [],
      status: 'exploring',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating scout theme:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
