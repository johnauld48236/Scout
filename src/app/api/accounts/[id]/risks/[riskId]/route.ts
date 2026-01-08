import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE - Soft delete a risk (sets deleted_at timestamp)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const { riskId } = await params
  const supabase = await createClient()

  try {
    // Try soft delete first (set deleted_at), fall back to hard delete if column doesn't exist
    const { error } = await supabase
      .from('risks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('risk_id', riskId)

    if (error) {
      // If column doesn't exist, do hard delete
      if (error.message?.includes('deleted_at') || error.code === 'PGRST204') {
        const { error: hardDeleteError } = await supabase
          .from('risks')
          .delete()
          .eq('risk_id', riskId)

        if (hardDeleteError) {
          console.error('Supabase error:', hardDeleteError)
          return NextResponse.json(
            { error: hardDeleteError.message, details: hardDeleteError.details },
            { status: 400 }
          )
        }
      } else {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete risk' },
      { status: 500 }
    )
  }
}

// PATCH - Update a risk
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; riskId: string }> }
) {
  const { riskId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    // risks table has NO title column - only description
    // Map title → description for UI compatibility
    if (body.title !== undefined) {
      updateData.description = body.title || ''
    }
    if (body.description !== undefined) {
      updateData.description = body.description || body.title || ''
    }
    if (body.severity !== undefined) updateData.severity = body.severity
    if (body.priority !== undefined) updateData.severity = body.priority === 'P1' ? 'critical' : body.priority === 'P2' ? 'high' : 'medium'
    // Map tracker status to risk status
    if (body.status !== undefined) {
      // Tracker uses: open, in_progress, completed, closed
      // Risks use: open, mitigated, closed, realized
      if (body.status === 'completed') {
        updateData.status = 'mitigated'
      } else if (body.status === 'open' || body.status === 'closed') {
        updateData.status = body.status
      } else if (body.status === 'in_progress') {
        updateData.status = 'open'
      } else {
        updateData.status = body.status // Pass through for valid risk statuses
      }
    }
    if (body.mitigation !== undefined) updateData.mitigation = body.mitigation
    if (body.impact_on_bant !== undefined) updateData.impact_on_bant = body.impact_on_bant
    if (body.target_date !== undefined) updateData.target_date = body.target_date
    if (body.due_date !== undefined) updateData.target_date = body.due_date // Alias for target_date
    if (body.date_type !== undefined) updateData.date_type = body.date_type
    if (body.pursuit_id !== undefined) updateData.pursuit_id = body.pursuit_id
    if (body.initiative_id !== undefined) updateData.initiative_id = body.initiative_id
    if (body.bucket !== undefined) updateData.bucket = body.bucket
    // Support restore by setting deleted_at to null
    if (body.deleted_at === null) updateData.deleted_at = null

    // Final safety: never send null description to database
    if (updateData.description === null || updateData.description === undefined) {
      delete updateData.description
    }

    const { data, error } = await supabase
      .from('risks')
      .update(updateData)
      .eq('risk_id', riskId)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      )
    }

    return NextResponse.json({ risk: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to update risk' },
      { status: 500 }
    )
  }
}
