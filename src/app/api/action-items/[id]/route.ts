import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.status !== undefined) updates.status = body.status
    if (body.owner !== undefined) updates.owner = body.owner
    if (body.due_date !== undefined) updates.due_date = body.due_date
    if (body.category !== undefined) updates.category = body.category
    if (body.week_number !== undefined) updates.week_number = body.week_number
    if (body.pursuit_id !== undefined) updates.pursuit_id = body.pursuit_id
    // 30/60/90 bucket support
    if (body.bucket !== undefined) updates.bucket = body.bucket
    if (body.slip_acknowledged !== undefined) updates.slip_acknowledged = body.slip_acknowledged

    const { data, error } = await supabase
      .from('action_items')
      .update(updates)
      .eq('action_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating action item:', error)
      return Response.json({ error: 'Failed to update action item' }, { status: 500 })
    }

    return Response.json({ success: true, action: data })
  } catch (error) {
    console.error('Action items API error:', error)
    return Response.json({ error: 'Failed to update action item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('action_id', id)
      .single()

    if (error) {
      console.error('Error fetching action item:', error)
      return Response.json({ error: 'Failed to fetch action item' }, { status: 500 })
    }

    return Response.json({ action: data })
  } catch (error) {
    console.error('Action items API error:', error)
    return Response.json({ error: 'Failed to fetch action item' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('action_id', id)

    if (error) {
      console.error('Error deleting action item:', error)
      return Response.json({ error: 'Failed to delete action item' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Action items API error:', error)
    return Response.json({ error: 'Failed to delete action item' }, { status: 500 })
  }
}
