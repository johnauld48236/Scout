import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get risks for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .eq('account_plan_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    return NextResponse.json({ risks: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risks' },
      { status: 500 }
    )
  }
}

// POST - Create a new risk
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()

    // Build insert object with only valid fields
    // risks table has NO title column - only description
    const insertData: Record<string, unknown> = {
      account_plan_id: id,
      description: body.title || body.description || 'Untitled',
      severity: body.severity || 'medium',
      status: body.status || 'open',
    }

    // Add optional fields only if they have values
    if (body.pursuit_id) insertData.pursuit_id = body.pursuit_id
    if (body.mitigation) insertData.mitigation = body.mitigation
    if (body.impact_on_bant) insertData.impact_on_bant = body.impact_on_bant
    if (body.target_date) insertData.target_date = body.target_date

    // Review queue fields (added by migration, may not exist yet)
    const reviewFields: Record<string, unknown> = {}
    if (body.needs_review !== undefined) reviewFields.needs_review = body.needs_review
    if (body.import_source) reviewFields.import_source = body.import_source
    if (body.import_batch_id) reviewFields.import_batch_id = body.import_batch_id

    // Try with review fields first, fall back without them if columns don't exist
    let result = await supabase
      .from('risks')
      .insert({ ...insertData, ...reviewFields })
      .select()
      .single()

    // If error mentions missing column, retry without review fields
    if (result.error?.message?.includes('column') || result.error?.code === 'PGRST204') {
      result = await supabase
        .from('risks')
        .insert(insertData)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return NextResponse.json(
        { error: result.error.message, details: result.error.details, hint: result.error.hint, code: result.error.code },
        { status: 400 }
      )
    }

    return NextResponse.json({ risk: result.data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to create risk' },
      { status: 500 }
    )
  }
}
