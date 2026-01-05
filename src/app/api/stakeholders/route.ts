import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Handle bulk insert (from HubSpot import)
    if (body.stakeholders && Array.isArray(body.stakeholders)) {
      const { account_plan_id, stakeholders } = body

      if (!account_plan_id) {
        return Response.json({ error: 'account_plan_id is required' }, { status: 400 })
      }

      const insertData = stakeholders.map((s: Record<string, unknown>) => ({
        account_plan_id,
        full_name: s.full_name || 'TBD',
        title: s.title || null,
        email: s.email || null,
        phone: s.phone || null,
        hubspot_contact_id: s.hubspot_contact_id || null,
        source: s.source || null,
      }))

      const { data: inserted, error } = await supabase
        .from('stakeholders')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Error bulk creating stakeholders:', error)
        return Response.json({ error: `Failed to create stakeholders: ${error.message}` }, { status: 500 })
      }

      return Response.json({ success: true, stakeholders: inserted, count: inserted?.length || 0 })
    }

    // Handle single insert (original behavior)
    const {
      account_plan_id,
      full_name,
      title,
      role_type,
      sentiment,
      email,
      linkedin_url,
      business_unit,
      is_placeholder,
      placeholder_role,
    } = body

    if (!account_plan_id) {
      return Response.json({ error: 'account_plan_id is required' }, { status: 400 })
    }

    if (!full_name && !title) {
      return Response.json({ error: 'Either full_name or title is required' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      account_plan_id,
      full_name: full_name || 'TBD',
    }

    if (title) insertData.title = title
    if (role_type) insertData.role_type = role_type
    if (sentiment) insertData.sentiment = sentiment
    if (email) insertData.email = email
    if (linkedin_url) insertData.linkedin_url = linkedin_url
    if (business_unit) insertData.business_unit = business_unit
    if (is_placeholder !== undefined) insertData.is_placeholder = is_placeholder
    if (placeholder_role) insertData.placeholder_role = placeholder_role

    const { data: stakeholder, error } = await supabase
      .from('stakeholders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating stakeholder:', error)
      return Response.json({ error: `Failed to create stakeholder: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, stakeholder })
  } catch (error) {
    console.error('Stakeholder API error:', error)
    return Response.json({ error: 'Failed to create stakeholder' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { stakeholder_id, ...updateFields } = body

    if (!stakeholder_id) {
      return Response.json({ error: 'stakeholder_id is required' }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    const allowedFields = [
      'full_name',
      'title',
      'email',
      'phone',
      'linkedin_url',
      'role_type',
      'sentiment',
      'business_unit',
      'department',
      'division_id',
      'is_placeholder',
      'placeholder_role',
      'notes',
      'profile_notes',
      'relationship_strength',
      'relationship_history',
      'purchasing_authority',
      'last_contact_date',
      'preferred_contact_method',
      'key_concerns',
      'communication_style',
    ]

    for (const field of allowedFields) {
      if (field in updateFields) {
        // Handle null values for clearing fields
        updateData[field] = updateFields[field] === '' ? null : updateFields[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: stakeholder, error } = await supabase
      .from('stakeholders')
      .update(updateData)
      .eq('stakeholder_id', stakeholder_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating stakeholder:', error)
      return Response.json({ error: `Failed to update stakeholder: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, stakeholder })
  } catch (error) {
    console.error('Stakeholder API error:', error)
    return Response.json({ error: 'Failed to update stakeholder' }, { status: 500 })
  }
}
