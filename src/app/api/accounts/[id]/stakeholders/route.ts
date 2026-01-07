import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Build insert object with only fields that have values
    const insertData: Record<string, unknown> = {
      account_plan_id: id,
      full_name: body.full_name,
    }

    if (body.title) insertData.title = body.title
    if (body.email) insertData.email = body.email
    if (body.phone) insertData.phone = body.phone
    if (body.role_type) insertData.role_type = body.role_type
    if (body.business_unit) insertData.business_unit = body.business_unit

    // Compass fields for confirmed vs waypoint distinction
    if (body.is_placeholder !== undefined) insertData.is_placeholder = body.is_placeholder
    if (body.placeholder_role) insertData.placeholder_role = body.placeholder_role

    // Optional fields that may not exist in schema yet
    const optionalFields: Record<string, unknown> = {}
    if (body.department) optionalFields.department = body.department
    if (body.influence_level) optionalFields.influence_level = body.influence_level

    // Try with optional fields first, fall back without them
    let result = await supabase
      .from('stakeholders')
      .insert({ ...insertData, ...optionalFields })
      .select()
      .single()

    // If error mentions missing column, retry without optional fields
    if (result.error?.message?.includes('column')) {
      result = await supabase
        .from('stakeholders')
        .insert(insertData)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Stakeholder insert error:', result.error)
      return Response.json({ error: result.error.message }, { status: 500 })
    }

    const data = result.data

    return Response.json(data)
  } catch (error) {
    console.error('Add stakeholder error:', error)
    return Response.json({ error: 'Failed to add stakeholder' }, { status: 500 })
  }
}
