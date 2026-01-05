import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get pursuits linked to a pain point
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; painPointId: string }> }
) {
  const { painPointId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('pain_point_pursuits')
      .select('pursuit_id')
      .eq('pain_point_id', painPointId)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ pursuit_ids: data?.map(r => r.pursuit_id) || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to fetch pain point pursuits' }, { status: 500 })
  }
}

// POST - Add pursuit to pain point
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; painPointId: string }> }
) {
  const { painPointId } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { pursuit_id } = body

    if (!pursuit_id) {
      return NextResponse.json({ error: 'pursuit_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pain_point_pursuits')
      .insert({ pain_point_id: painPointId, pursuit_id })

    if (error) {
      if (error.code !== '23505') {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to add pursuit to pain point' }, { status: 500 })
  }
}

// DELETE - Remove pursuit from pain point
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; painPointId: string }> }
) {
  const { painPointId } = await params
  const supabase = await createClient()

  try {
    const { searchParams } = new URL(request.url)
    const pursuit_id = searchParams.get('pursuit_id')

    if (!pursuit_id) {
      return NextResponse.json({ error: 'pursuit_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pain_point_pursuits')
      .delete()
      .eq('pain_point_id', painPointId)
      .eq('pursuit_id', pursuit_id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Failed to remove pursuit from pain point' }, { status: 500 })
  }
}
