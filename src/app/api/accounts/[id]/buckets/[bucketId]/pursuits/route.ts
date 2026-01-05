import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get pursuits linked to a bucket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('bucket_pursuits')
      .select('pursuit_id')
      .eq('bucket_id', bucketId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ pursuit_ids: data?.map(r => r.pursuit_id) || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch bucket pursuits' }, { status: 500 })
  }
}

// PUT - Set all pursuits for a bucket (replaces existing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { pursuit_ids } = body // array of pursuit IDs

    // Delete existing links
    await supabase
      .from('bucket_pursuits')
      .delete()
      .eq('bucket_id', bucketId)

    // Insert new links
    if (pursuit_ids && pursuit_ids.length > 0) {
      const inserts = pursuit_ids.map((pursuit_id: string) => ({
        bucket_id: bucketId,
        pursuit_id,
      }))

      const { error } = await supabase
        .from('bucket_pursuits')
        .insert(inserts)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to update bucket pursuits' }, { status: 500 })
  }
}

// POST - Add pursuit to bucket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { pursuit_id } = body

    if (!pursuit_id) {
      return NextResponse.json({ error: 'pursuit_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('bucket_pursuits')
      .insert({ bucket_id: bucketId, pursuit_id })

    if (error) {
      if (error.code !== '23505') {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to add pursuit to bucket' }, { status: 500 })
  }
}

// DELETE - Remove pursuit from bucket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  const { bucketId } = await params
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const pursuit_id = searchParams.get('pursuit_id')

    if (!pursuit_id) {
      return NextResponse.json({ error: 'pursuit_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('bucket_pursuits')
      .delete()
      .eq('bucket_id', bucketId)
      .eq('pursuit_id', pursuit_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to remove pursuit from bucket' }, { status: 500 })
  }
}
