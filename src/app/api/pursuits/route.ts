import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.account_plan_id) {
      return Response.json({ error: 'account_plan_id is required' }, { status: 400 })
    }
    if (!body.name) {
      return Response.json({ error: 'name is required' }, { status: 400 })
    }

    // Build insert object with only defined fields
    // Note: Don't include stage - let DB use its default (the enum might not accept our values)
    const insertData: Record<string, unknown> = {
      account_plan_id: body.account_plan_id,
      name: body.name,
    }

    // Add optional fields only if they have values
    // Note: 'description' and 'notes' columns don't exist in pursuits table
    // Store description in thesis field if thesis is empty
    if (body.thesis) {
      insertData.thesis = body.thesis
    } else if (body.description) {
      insertData.thesis = body.description
    }
    if (body.estimated_value !== undefined && body.estimated_value !== null) {
      insertData.estimated_value = body.estimated_value
    }
    if (body.business_unit_id) insertData.business_unit_id = body.business_unit_id
    if (body.signal_ids) insertData.signal_ids = body.signal_ids
    if (body.engagement_plan) insertData.engagement_plan = body.engagement_plan
    if (body.pursuit_type) insertData.pursuit_type = body.pursuit_type
    if (body.pipeline_placeholder_id) insertData.pipeline_placeholder_id = body.pipeline_placeholder_id
    if (body.originated_from_tam !== undefined) insertData.originated_from_tam = body.originated_from_tam
    if (body.source_tam_account_id) insertData.source_tam_account_id = body.source_tam_account_id

    const { data, error } = await supabase
      .from('pursuits')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      // Log full error object for debugging
      console.error('Error creating pursuit:', JSON.stringify(error, null, 2))
      return Response.json({
        error: 'Failed to create pursuit',
        details: error.message || error.code || 'Unknown database error',
        hint: error.hint || error.details || '',
        code: error.code
      }, { status: 500 })
    }

    return Response.json({ success: true, pursuit: data })
  } catch (error) {
    console.error('Pursuits API error:', error)
    return Response.json({ error: 'Failed to create pursuit' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.pursuit_id) {
      return Response.json({ error: 'pursuit_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pursuits')
      .delete()
      .eq('pursuit_id', body.pursuit_id)

    if (error) {
      console.error('Error deleting pursuit:', error)
      return Response.json({ error: 'Failed to delete pursuit' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Pursuits API error:', error)
    return Response.json({ error: 'Failed to delete pursuit' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.pursuit_id) {
      return Response.json({ error: 'pursuit_id is required' }, { status: 400 })
    }

    // Build update object with only defined fields
    // Note: Don't include description, notes, or stage (schema issues)
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.estimated_value !== undefined) updates.estimated_value = body.estimated_value
    if (body.business_unit_id !== undefined) updates.business_unit_id = body.business_unit_id
    if (body.thesis !== undefined) updates.thesis = body.thesis
    if (body.signal_ids !== undefined) updates.signal_ids = body.signal_ids
    if (body.engagement_plan !== undefined) updates.engagement_plan = body.engagement_plan
    if (body.pursuit_type !== undefined) updates.pursuit_type = body.pursuit_type
    if (body.pipeline_placeholder_id !== undefined) updates.pipeline_placeholder_id = body.pipeline_placeholder_id

    // Only proceed if there are updates to make
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pursuits')
      .update(updates)
      .eq('pursuit_id', body.pursuit_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating pursuit:', JSON.stringify(error, null, 2))
      return Response.json({
        error: 'Failed to update pursuit',
        details: error.message || error.code || 'Unknown database error',
        hint: error.hint || error.details || '',
        code: error.code
      }, { status: 500 })
    }

    return Response.json({ success: true, pursuit: data })
  } catch (error) {
    console.error('Pursuits API error:', error)
    return Response.json({ error: 'Failed to update pursuit' }, { status: 500 })
  }
}
