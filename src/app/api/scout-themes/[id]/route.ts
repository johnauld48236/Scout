import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Support both PUT and PATCH for updating scout themes
async function handleUpdate(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { title, description, why_it_matters, size, status, questions_to_explore, converted_to_pursuit_id, linked_pursuit_id } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (why_it_matters !== undefined) updateData.why_it_matters = why_it_matters
  if (size !== undefined) updateData.size = size
  if (status !== undefined) updateData.status = status
  if (questions_to_explore !== undefined) updateData.questions_to_explore = questions_to_explore
  if (converted_to_pursuit_id !== undefined) updateData.converted_to_pursuit_id = converted_to_pursuit_id
  if (linked_pursuit_id !== undefined) updateData.linked_pursuit_id = linked_pursuit_id

  const { data, error } = await supabase
    .from('scout_themes')
    .update(updateData)
    .eq('theme_id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating scout theme:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Soft delete by setting status to dismissed
  const { error } = await supabase
    .from('scout_themes')
    .update({ status: 'dismissed' })
    .eq('theme_id', id)

  if (error) {
    console.error('Error dismissing scout theme:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
