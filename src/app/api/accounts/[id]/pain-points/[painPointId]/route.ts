import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// PATCH - Update a pain point (primarily for target_date updates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; painPointId: string }> }
) {
  const { id, painPointId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    console.log('[PATCH pain-points] Request body:', JSON.stringify(body, null, 2))
    console.log('[PATCH pain-points] painPointId:', painPointId, 'accountId:', id)

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    // pain_points table has NO title column - only description
    // Map title → description for UI compatibility
    if (body.title !== undefined) {
      updateData.description = body.title || ''
    }
    if (body.description !== undefined) {
      updateData.description = body.description || body.title || ''
    }
    if (body.severity !== undefined) updateData.severity = body.severity
    // Map tracker status to pain_point status
    if (body.status !== undefined) {
      // Tracker uses: open, in_progress, completed, closed
      // Pain points use: active, addressed
      if (body.status === 'completed' || body.status === 'closed' || body.status === 'addressed') {
        updateData.status = 'addressed'
      } else {
        updateData.status = 'active'
      }
    }
    if (body.priority !== undefined) updateData.severity = body.priority === 'P1' ? 'critical' : body.priority === 'P2' ? 'significant' : 'moderate'
    if (body.target_date !== undefined) updateData.target_date = body.target_date
    if (body.due_date !== undefined) updateData.target_date = body.due_date // Alias for target_date
    if (body.date_type !== undefined) updateData.date_type = body.date_type
    if (body.source_type !== undefined) updateData.source_type = body.source_type
    if (body.source_date !== undefined) updateData.source_date = body.source_date
    if (body.stakeholder_id !== undefined) updateData.stakeholder_id = body.stakeholder_id
    if (body.pursuit_id !== undefined) updateData.pursuit_id = body.pursuit_id
    if (body.addressed_date !== undefined) updateData.addressed_date = body.addressed_date
    if (body.addressed_notes !== undefined) updateData.addressed_notes = body.addressed_notes
    if (body.initiative_id !== undefined) updateData.initiative_id = body.initiative_id
    if (body.bucket !== undefined) updateData.bucket = body.bucket

    // Final safety: never send null description to database
    if (updateData.description === null || updateData.description === undefined) {
      delete updateData.description
    }

    console.log('[PATCH pain-points] updateData:', JSON.stringify(updateData, null, 2))

    const { data, error } = await supabase
      .from('pain_points')
      .update(updateData)
      .eq('pain_point_id', painPointId)
      .eq('account_plan_id', id)
      .select()
      .single()

    if (error) {
      console.error('[PATCH pain-points] Supabase error:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          updateData_sent: updateData
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ pain_point: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pain point', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete a pain point
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; painPointId: string }> }
) {
  const { id, painPointId } = await params
  const supabase = await createClient()

  try {
    // Try soft delete first, fall back to hard delete if column doesn't exist
    const { error } = await supabase
      .from('pain_points')
      .update({ deleted_at: new Date().toISOString() })
      .eq('pain_point_id', painPointId)
      .eq('account_plan_id', id)

    if (error) {
      if (error.message?.includes('deleted_at') || error.code === 'PGRST204') {
        // Column doesn't exist, do hard delete
        const { error: hardDeleteError } = await supabase
          .from('pain_points')
          .delete()
          .eq('pain_point_id', painPointId)
          .eq('account_plan_id', id)

        if (hardDeleteError) {
          console.error('Supabase error:', hardDeleteError)
          return NextResponse.json(
            { error: hardDeleteError.message },
            { status: 400 }
          )
        }
      } else {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pain point' },
      { status: 500 }
    )
  }
}
