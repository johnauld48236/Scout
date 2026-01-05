import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get single bucket with its items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { data: bucket, error } = await supabase
      .from('buckets')
      .select('*')
      .eq('bucket_id', bucketId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Get items in this bucket
    const { data: items } = await supabase
      .from('bucket_items')
      .select('*')
      .eq('bucket_id', bucketId)

    return NextResponse.json({ bucket, items: items || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch bucket' }, { status: 500 })
  }
}

// PATCH - Update bucket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.instructions !== undefined) updateData.instructions = body.instructions
    if (body.target_date !== undefined) updateData.target_date = body.target_date
    if (body.color !== undefined) updateData.color = body.color
    if (body.status !== undefined) updateData.status = body.status
    if (body.importance !== undefined) updateData.importance = body.importance
    if (body.pursuit_id !== undefined) updateData.pursuit_id = body.pursuit_id
    if (typeof body.display_order === 'number') updateData.display_order = body.display_order

    const { data, error } = await supabase
      .from('buckets')
      .update(updateData)
      .eq('bucket_id', bucketId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bucket: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to update bucket' }, { status: 500 })
  }
}

// DELETE - Delete bucket (cascade removes all item tags)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('buckets')
      .delete()
      .eq('bucket_id', bucketId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to delete bucket' }, { status: 500 })
  }
}
