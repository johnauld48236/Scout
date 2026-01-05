import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/accounts/[id]/divisions/[divisionId] - Get a single division
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { divisionId } = await params
    const supabase = await createClient()

    const { data: division, error } = await supabase
      .from('account_divisions')
      .select('*')
      .eq('division_id', divisionId)
      .single()

    if (error) {
      console.error('Error fetching division:', error)
      return Response.json({ error: 'Division not found' }, { status: 404 })
    }

    return Response.json({ success: true, division })
  } catch (error) {
    console.error('Division API error:', error)
    return Response.json({ error: 'Failed to fetch division' }, { status: 500 })
  }
}

// PATCH /api/accounts/[id]/divisions/[divisionId] - Update a division
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { divisionId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const allowedFields = [
      'name',
      'description',
      'division_type',
      'products',
      'parent_division_id',
      'headcount',
      'revenue_estimate',
      'key_focus_areas',
      'sort_order',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: division, error } = await supabase
      .from('account_divisions')
      .update(updateData)
      .eq('division_id', divisionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating division:', error)
      return Response.json({ error: `Failed to update division: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, division })
  } catch (error) {
    console.error('Division API error:', error)
    return Response.json({ error: 'Failed to update division' }, { status: 500 })
  }
}

// DELETE /api/accounts/[id]/divisions/[divisionId] - Delete a division
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; divisionId: string }> }
) {
  try {
    const { divisionId } = await params
    const supabase = await createClient()

    // First, unlink any stakeholders from this division
    await supabase
      .from('prospect_contacts')
      .update({ division_id: null })
      .eq('division_id', divisionId)

    // Delete the division
    const { error } = await supabase
      .from('account_divisions')
      .delete()
      .eq('division_id', divisionId)

    if (error) {
      console.error('Error deleting division:', error)
      return Response.json({ error: `Failed to delete division: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Division API error:', error)
    return Response.json({ error: 'Failed to delete division' }, { status: 500 })
  }
}
