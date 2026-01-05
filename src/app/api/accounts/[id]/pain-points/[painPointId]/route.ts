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

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (body.description !== undefined) updateData.description = body.description
    if (body.severity !== undefined) updateData.severity = body.severity
    if (body.status !== undefined) updateData.status = body.status
    if (body.target_date !== undefined) updateData.target_date = body.target_date
    if (body.date_type !== undefined) updateData.date_type = body.date_type
    if (body.source_type !== undefined) updateData.source_type = body.source_type
    if (body.source_date !== undefined) updateData.source_date = body.source_date
    if (body.stakeholder_id !== undefined) updateData.stakeholder_id = body.stakeholder_id
    if (body.pursuit_id !== undefined) updateData.pursuit_id = body.pursuit_id
    if (body.addressed_date !== undefined) updateData.addressed_date = body.addressed_date
    if (body.addressed_notes !== undefined) updateData.addressed_notes = body.addressed_notes

    const { data, error } = await supabase
      .from('pain_points')
      .update(updateData)
      .eq('pain_point_id', painPointId)
      .eq('account_plan_id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    return NextResponse.json({ pain_point: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to update pain point' },
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
