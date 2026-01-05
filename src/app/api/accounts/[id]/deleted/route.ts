import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get recently deleted items for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Get deleted items from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    // Fetch deleted risks
    const { data: risks } = await supabase
      .from('risks')
      .select('risk_id, description, severity, deleted_at')
      .eq('account_plan_id', id)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoffDate)
      .order('deleted_at', { ascending: false })

    // Fetch deleted pain points
    const { data: painPoints } = await supabase
      .from('pain_points')
      .select('pain_point_id, description, severity, deleted_at')
      .eq('account_plan_id', id)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoffDate)
      .order('deleted_at', { ascending: false })

    // Fetch deleted action items
    const { data: actions } = await supabase
      .from('action_items')
      .select('action_id, title, priority, deleted_at')
      .eq('account_plan_id', id)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoffDate)
      .order('deleted_at', { ascending: false })

    return NextResponse.json({
      risks: risks || [],
      painPoints: painPoints || [],
      actions: actions || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deleted items' },
      { status: 500 }
    )
  }
}

// POST - Restore a deleted item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { item_type, item_id } = body

    if (!item_type || !item_id) {
      return NextResponse.json(
        { error: 'item_type and item_id are required' },
        { status: 400 }
      )
    }

    let table: string
    let idColumn: string

    switch (item_type) {
      case 'risk':
        table = 'risks'
        idColumn = 'risk_id'
        break
      case 'pain_point':
        table = 'pain_points'
        idColumn = 'pain_point_id'
        break
      case 'action':
        table = 'action_items'
        idColumn = 'action_id'
        break
      default:
        return NextResponse.json(
          { error: `Unknown item type: ${item_type}` },
          { status: 400 }
        )
    }

    const { error } = await supabase
      .from(table)
      .update({ deleted_at: null })
      .eq(idColumn, item_id)
      .eq('account_plan_id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to restore item' },
      { status: 500 }
    )
  }
}
