import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Reject/dismiss items from review queue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { items } = body // Array of { item_type, item_id }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      )
    }

    const results = {
      rejected: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const item of items) {
      const { item_type, item_id } = item

      if (!item_type || !item_id) {
        results.failed++
        results.errors.push(`Invalid item: ${JSON.stringify(item)}`)
        continue
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
          results.failed++
          results.errors.push(`Unknown item type: ${item_type}`)
          continue
      }

      // Delete the item
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, item_id)
        .eq('account_plan_id', id)

      if (error) {
        results.failed++
        results.errors.push(`Failed to reject ${item_type} ${item_id}: ${error.message}`)
      } else {
        results.rejected++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to reject items' },
      { status: 500 }
    )
  }
}
