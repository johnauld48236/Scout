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

    // Handle title field - map to both title and description for compatibility
    if (body.title !== undefined) {
      updateData.title = body.title
      // Also set description if not explicitly provided (description is required in DB)
      if (body.description === undefined || body.description === null) {
        updateData.description = body.title
      }
    }
    // Handle description - never set to null (use empty string or title as fallback)
    if (body.description !== undefined) {
      updateData.description = body.description || body.title || ''
    }
    if (body.severity !== undefined) updateData.severity = body.severity
    if (body.priority !== undefined) updateData.severity = body.priority === 'P1' ? 'critical' : body.priority === 'P2' ? 'high' : 'medium'
    if (body.status !== undefined) updateData.status = body.status
    if (body.mitigation !== undefined) updateData.mitigation = body.mitigation
    if (body.impact_on_bant !== undefined) updateData.impact_on_bant = body.impact_on_bant
    if (body.target_date !== undefined) updateData.target_date = body.target_date
    if (body.due_date !== undefined) updateData.target_date = body.due_date // Alias for target_date
    if (body.date_type !== undefined) updateData.date_type = body.date_type
    if (body.pursuit_id !== undefined) updateData.pursuit_id = body.pursuit_id
    // Support restore by setting deleted_at to null
    if (body.deleted_at === null) updateData.deleted_at = null

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
