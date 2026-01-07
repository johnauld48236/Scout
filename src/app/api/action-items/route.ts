import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.account_plan_id) {
      return Response.json({ error: 'account_plan_id is required' }, { status: 400 })
    }
    if (!body.title) {
      return Response.json({ error: 'title is required' }, { status: 400 })
    }

    // Build insert object with only defined fields
    // Note: Don't include status - let DB use its default (the enum might not accept our values)
    const insertData: Record<string, unknown> = {
      account_plan_id: body.account_plan_id,
      title: body.title,
      priority: body.priority || 'Medium',
    }

    // Add optional fields only if they have values
    // Only add pursuit_id if it's a valid UUID (not a temp ID like "pursuit-123")
    if (body.pursuit_id && !body.pursuit_id.startsWith('pursuit-')) {
      insertData.pursuit_id = body.pursuit_id
    }
    if (body.description) insertData.description = body.description
    if (body.owner) insertData.owner = body.owner
    if (body.due_date) insertData.due_date = body.due_date
    if (body.category) insertData.category = body.category
    if (body.week_number !== undefined && body.week_number !== null) {
      insertData.week_number = body.week_number
    }
    // 30/60/90 bucket support
    if (body.bucket) insertData.bucket = body.bucket
    if (body.slip_acknowledged !== undefined) insertData.slip_acknowledged = body.slip_acknowledged

    const { data, error } = await supabase
      .from('action_items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Log full error object for debugging
      console.error('Error creating action item:', JSON.stringify(error, null, 2))
      return Response.json({
        error: 'Failed to create action item',
        details: error.message || error.code || 'Unknown database error',
        hint: error.hint || error.details || '',
        code: error.code
      }, { status: 500 })
    }

    return Response.json({ success: true, action: data })
  } catch (error) {
    console.error('Action items API error:', error)
    return Response.json({ error: 'Failed to create action item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.action_id) {
      return Response.json({ error: 'action_id is required' }, { status: 400 })
    }

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
      .eq('action_id', body.action_id)
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.action_id) {
      return Response.json({ error: 'action_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('action_items')
      .delete()
      .eq('action_id', body.action_id)

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
