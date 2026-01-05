import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST - Reclassify an item (e.g., pain_point -> risk)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { item_type, item_id, new_type, accept } = body

    if (!item_type || !item_id || !new_type) {
      return NextResponse.json(
        { error: 'item_type, item_id, and new_type are required' },
        { status: 400 }
      )
    }

    if (item_type === new_type) {
      return NextResponse.json(
        { error: 'new_type must be different from current type' },
        { status: 400 }
      )
    }

    // Determine source table and ID column
    let sourceTable: string
    let sourceIdColumn: string

    switch (item_type) {
      case 'risk':
        sourceTable = 'risks'
        sourceIdColumn = 'risk_id'
        break
      case 'pain_point':
        sourceTable = 'pain_points'
        sourceIdColumn = 'pain_point_id'
        break
      default:
        return NextResponse.json(
          { error: 'Can only reclassify risks and pain_points' },
          { status: 400 }
        )
    }

    // Fetch the source item
    const { data: sourceItem, error: fetchError } = await supabase
      .from(sourceTable)
      .select('*')
      .eq(sourceIdColumn, item_id)
      .eq('account_plan_id', id)
      .single()

    if (fetchError || !sourceItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Handle pain_point -> risk conversion
    if (item_type === 'pain_point' && new_type === 'risk') {
      // Create new risk
      const { data: newRisk, error: createError } = await supabase
        .from('risks')
        .insert({
          account_plan_id: id,
          pursuit_id: sourceItem.pursuit_id,
          description: sourceItem.description,
          severity: mapSeverity(sourceItem.severity),
          status: 'open',
          needs_review: accept ? false : true,
          import_source: sourceItem.import_source,
          import_batch_id: sourceItem.import_batch_id,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json(
          { error: `Failed to create risk: ${createError.message}` },
          { status: 400 }
        )
      }

      // Delete original pain point
      const { error: deleteError } = await supabase
        .from('pain_points')
        .delete()
        .eq('pain_point_id', item_id)

      if (deleteError) {
        // Rollback - delete the newly created risk
        await supabase.from('risks').delete().eq('risk_id', newRisk.risk_id)
        return NextResponse.json(
          { error: `Failed to remove original: ${deleteError.message}` },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Reclassified pain point to risk',
        newItem: { type: 'risk', ...newRisk },
      })
    }

    // Handle risk -> pain_point conversion
    if (item_type === 'risk' && new_type === 'pain_point') {
      // Create new pain point
      const { data: newPainPoint, error: createError } = await supabase
        .from('pain_points')
        .insert({
          account_plan_id: id,
          pursuit_id: sourceItem.pursuit_id,
          description: sourceItem.description,
          severity: mapSeverityToPainPoint(sourceItem.severity),
          status: 'active',
          needs_review: accept ? false : true,
          import_source: sourceItem.import_source,
          import_batch_id: sourceItem.import_batch_id,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json(
          { error: `Failed to create pain point: ${createError.message}` },
          { status: 400 }
        )
      }

      // Delete original risk
      const { error: deleteError } = await supabase
        .from('risks')
        .delete()
        .eq('risk_id', item_id)

      if (deleteError) {
        // Rollback - delete the newly created pain point
        await supabase.from('pain_points').delete().eq('pain_point_id', newPainPoint.pain_point_id)
        return NextResponse.json(
          { error: `Failed to remove original: ${deleteError.message}` },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Reclassified risk to pain point',
        newItem: { type: 'pain_point', ...newPainPoint },
      })
    }

    return NextResponse.json(
      { error: 'Unsupported reclassification' },
      { status: 400 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to reclassify item' },
      { status: 500 }
    )
  }
}

// Map pain point severity to risk severity
function mapSeverity(painPointSeverity: string): string {
  const map: Record<string, string> = {
    critical: 'critical',
    significant: 'high',
    moderate: 'medium',
    minor: 'low',
  }
  return map[painPointSeverity] || 'medium'
}

// Map risk severity to pain point severity
function mapSeverityToPainPoint(riskSeverity: string): string {
  const map: Record<string, string> = {
    critical: 'critical',
    high: 'significant',
    medium: 'moderate',
    low: 'minor',
  }
  return map[riskSeverity] || 'moderate'
}
