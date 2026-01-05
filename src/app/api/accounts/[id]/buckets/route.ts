import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get buckets for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Get buckets with their item counts
    const { data: buckets, error } = await supabase
      .from('buckets')
      .select('*')
      .eq('account_plan_id', id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Get all bucket items for these buckets
    const bucketIds = buckets?.map(b => b.bucket_id) || []
    let bucketItems: Array<{bucket_id: string, item_type: string, item_id: string}> = []

    if (bucketIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('bucket_items')
        .select('bucket_id, item_type, item_id')
        .in('bucket_id', bucketIds)

      if (itemsError) {
        console.error('Error fetching bucket items:', itemsError)
      } else {
        bucketItems = items || []
      }
    }

    return NextResponse.json({ buckets, bucketItems })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buckets' },
      { status: 500 }
    )
  }
}

// POST - Create a new bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()

    const insertData: Record<string, unknown> = {
      account_plan_id: id,
      name: body.name,
      color: body.color || 'blue',
      status: 'active',
    }

    if (body.description) insertData.description = body.description
    if (body.instructions) insertData.instructions = body.instructions
    if (body.target_date) insertData.target_date = body.target_date
    if (body.pursuit_id) insertData.pursuit_id = body.pursuit_id
    if (body.importance) insertData.importance = body.importance
    if (typeof body.display_order === 'number') insertData.display_order = body.display_order

    const { data, error } = await supabase
      .from('buckets')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ bucket: data })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to create bucket' },
      { status: 500 }
    )
  }
}
