import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Helper to get Monday of current week
function getWeekMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

// Get review notes for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const unresolvedOnly = searchParams.get('unresolved') === 'true'
    const weekFilter = searchParams.get('week') // Optional: specific week

    let query = supabase
      .from('review_notes')
      .select('*')
      .eq('account_plan_id', id)
      .order('created_at', { ascending: false })

    if (unresolvedOnly) {
      query = query.eq('is_resolved', false)
    }

    if (weekFilter) {
      query = query.eq('review_week', weekFilter)
    }

    const { data: notes, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ notes: notes || [] })
  } catch (error) {
    console.error('Get review notes error:', error)
    return Response.json({ error: 'Failed to get review notes' }, { status: 500 })
  }
}

// Create a new review note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { note_text, note_type, created_by } = body

    if (!note_text?.trim()) {
      return Response.json({ error: 'Note text is required' }, { status: 400 })
    }

    const { data: note, error } = await supabase
      .from('review_notes')
      .insert({
        account_plan_id: id,
        note_text: note_text.trim(),
        note_type: note_type || 'general',
        created_by: created_by || 'Unknown',
        review_week: getWeekMonday(),
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, note })
  } catch (error) {
    console.error('Create review note error:', error)
    return Response.json({ error: 'Failed to create review note' }, { status: 500 })
  }
}

// Update a review note (resolve/unresolve)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { note_id, is_resolved, note_text } = body

    if (!note_id) {
      return Response.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    if (is_resolved !== undefined) {
      updateData.is_resolved = is_resolved
      if (is_resolved) {
        updateData.resolved_at = new Date().toISOString()
      } else {
        updateData.resolved_at = null
      }
    }

    if (note_text !== undefined) {
      updateData.note_text = note_text.trim()
    }

    const { data: note, error } = await supabase
      .from('review_notes')
      .update(updateData)
      .eq('note_id', note_id)
      .eq('account_plan_id', id) // Ensure note belongs to this account
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, note })
  } catch (error) {
    console.error('Update review note error:', error)
    return Response.json({ error: 'Failed to update review note' }, { status: 500 })
  }
}

// Delete a review note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { note_id } = body

    if (!note_id) {
      return Response.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('review_notes')
      .delete()
      .eq('note_id', note_id)
      .eq('account_plan_id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete review note error:', error)
    return Response.json({ error: 'Failed to delete review note' }, { status: 500 })
  }
}
