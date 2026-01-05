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
    if (body.department) insertData.department = body.department

    const { data, error } = await supabase
      .from('stakeholders')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Stakeholder insert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    console.error('Add stakeholder error:', error)
    return Response.json({ error: 'Failed to add stakeholder' }, { status: 500 })
  }
}
