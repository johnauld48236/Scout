import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/pipeline-placeholders - Get all open placeholders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status') || 'open'
    const vertical = searchParams.get('vertical')

    let query = supabase
      .from('pipeline_placeholders')
      .select('*')
      .eq('status', status)
      .order('target_year')
      .order('target_quarter')

    if (vertical) {
      query = query.eq('vertical', vertical)
    }

    const { data: placeholders, error } = await query

    if (error) {
      console.error('Error fetching placeholders:', error)
      return Response.json({ error: 'Failed to fetch placeholders' }, { status: 500 })
    }

    return Response.json({ placeholders: placeholders || [] })
  } catch (error) {
    console.error('Pipeline placeholders API error:', error)
    return Response.json({ error: 'Failed to fetch placeholders' }, { status: 500 })
  }
}

// POST /api/pipeline-placeholders - Create placeholder
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: placeholder, error } = await supabase
      .from('pipeline_placeholders')
      .insert({
        name: body.name,
        placeholder_type: body.placeholder_type,
        vertical: body.vertical,
        target_quarter: body.target_quarter,
        target_year: body.target_year || 2026,
        projected_value: body.projected_value,
        probability: body.probability,
        goal_id: body.goal_id,
        campaign_id: body.campaign_id,
        notes: body.notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating placeholder:', error)
      return Response.json({ error: 'Failed to create placeholder' }, { status: 500 })
    }

    return Response.json({ placeholder })
  } catch (error) {
    console.error('Pipeline placeholders API error:', error)
    return Response.json({ error: 'Failed to create placeholder' }, { status: 500 })
  }
}

// PUT /api/pipeline-placeholders - Update placeholder (including filling it)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { placeholder_id, ...updates } = body

    if (!placeholder_id) {
      return Response.json({ error: 'placeholder_id is required' }, { status: 400 })
    }

    // If filling the placeholder, set filled_at
    if (updates.status === 'filled' && updates.filled_by_pursuit_id) {
      updates.filled_at = new Date().toISOString()
    }

    const { data: placeholder, error } = await supabase
      .from('pipeline_placeholders')
      .update(updates)
      .eq('placeholder_id', placeholder_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating placeholder:', error)
      return Response.json({ error: 'Failed to update placeholder' }, { status: 500 })
    }

    return Response.json({ placeholder })
  } catch (error) {
    console.error('Pipeline placeholders API error:', error)
    return Response.json({ error: 'Failed to update placeholder' }, { status: 500 })
  }
}
