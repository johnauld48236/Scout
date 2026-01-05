import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/accounts/[id]/divisions - Get all divisions for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: divisions, error } = await supabase
      .from('account_divisions')
      .select('*')
      .eq('account_plan_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching divisions:', error)
      return Response.json({ error: 'Failed to fetch divisions' }, { status: 500 })
    }

    return Response.json({ success: true, divisions })
  } catch (error) {
    console.error('Divisions API error:', error)
    return Response.json({ error: 'Failed to fetch divisions' }, { status: 500 })
  }
}

// POST /api/accounts/[id]/divisions - Create a new division
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const divisionData = {
      account_plan_id: id,
      name: body.name,
      description: body.description || null,
      division_type: body.division_type || 'division',
      products: body.products || [],
      parent_division_id: body.parent_division_id || null,
      headcount: body.headcount || null,
      revenue_estimate: body.revenue_estimate || null,
      key_focus_areas: body.key_focus_areas || [],
      sort_order: body.sort_order || 0,
    }

    const { data: division, error } = await supabase
      .from('account_divisions')
      .insert(divisionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating division:', error)
      return Response.json({ error: `Failed to create division: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, division })
  } catch (error) {
    console.error('Divisions API error:', error)
    return Response.json({ error: 'Failed to create division' }, { status: 500 })
  }
}

// PUT /api/accounts/[id]/divisions - Bulk update/replace divisions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { divisions } = body

    if (!Array.isArray(divisions)) {
      return Response.json({ error: 'divisions must be an array' }, { status: 400 })
    }

    // Delete existing divisions
    await supabase
      .from('account_divisions')
      .delete()
      .eq('account_plan_id', id)

    // Insert new divisions if any
    if (divisions.length > 0) {
      const divisionsWithAccountId = divisions.map((d, index) => ({
        account_plan_id: id,
        name: d.name,
        description: d.description || null,
        division_type: d.division_type || 'division',
        products: d.products || [],
        parent_division_id: d.parent_division_id || null,
        headcount: d.headcount || null,
        revenue_estimate: d.revenue_estimate || null,
        key_focus_areas: d.key_focus_areas || [],
        sort_order: d.sort_order ?? index,
      }))

      const { error } = await supabase
        .from('account_divisions')
        .insert(divisionsWithAccountId)

      if (error) {
        console.error('Error inserting divisions:', error)
        return Response.json({ error: `Failed to save divisions: ${error.message}` }, { status: 500 })
      }
    }

    // Fetch updated divisions
    const { data: updatedDivisions } = await supabase
      .from('account_divisions')
      .select('*')
      .eq('account_plan_id', id)
      .order('sort_order', { ascending: true })

    return Response.json({ success: true, divisions: updatedDivisions })
  } catch (error) {
    console.error('Divisions API error:', error)
    return Response.json({ error: 'Failed to update divisions' }, { status: 500 })
  }
}
