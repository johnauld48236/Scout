import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - List items in a bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bucket_items')
      .select('*')
      .eq('bucket_id', bucketId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ items: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch bucket items' }, { status: 500 })
  }
}

// POST - Tag an item to a bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()

    if (!body.item_type || !body.item_id) {
      return NextResponse.json(
        { error: 'item_type and item_id are required' },
        { status: 400 }
      )
    }

    const validTypes = ['risk', 'pain_point', 'action', 'milestone']
    if (!validTypes.includes(body.item_type)) {
      return NextResponse.json(
        { error: `item_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bucket_items')
      .insert({
        bucket_id: bucketId,
        item_type: body.item_type,
        item_id: body.item_id,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate key error gracefully
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Item already tagged to this bucket' })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ bucketItem: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to tag item to bucket' }, { status: 500 })
  }
}

// DELETE - Remove an item from a bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('item_type')
    const itemId = searchParams.get('item_id')

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: 'item_type and item_id query params are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('bucket_items')
      .delete()
      .eq('bucket_id', bucketId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to remove item from bucket' }, { status: 500 })
  }
}
