import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Create new BANT analysis
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('bant_analyses')
      .insert({
        pursuit_id: body.pursuit_id,
        budget_score: body.budget_score || 0,
        authority_score: body.authority_score || 0,
        need_score: body.need_score || 0,
        timeline_score: body.timeline_score || 0,
        analysis_source: body.analysis_source || 'Quick Edit',
        budget_evidence: body.budget_evidence,
        authority_evidence: body.authority_evidence,
        need_evidence: body.need_evidence,
        timeline_evidence: body.timeline_evidence,
        key_gaps: body.key_gaps,
        recommended_actions: body.recommended_actions,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json({ bant_analysis: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to create BANT analysis' },
      { status: 500 }
    )
  }
}

// GET - Get BANT analyses for a pursuit
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams
  const pursuitId = searchParams.get('pursuit_id')

  if (!pursuitId) {
    return NextResponse.json({ error: 'pursuit_id is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('bant_analyses')
      .select('*')
      .eq('pursuit_id', pursuitId)
      .order('analysis_date', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    return NextResponse.json({ bant_analyses: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BANT analyses' },
      { status: 500 }
    )
  }
}
