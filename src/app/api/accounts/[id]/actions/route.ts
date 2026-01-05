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

    // Build insert object with only valid fields
    // Note: Don't include status - let DB use its default (the enum might not accept our values)
    const insertData: Record<string, unknown> = {
      account_plan_id: id,
      title: body.title,
      priority: body.priority || 'Medium',
    }

    // Add optional fields only if they have values
    if (body.due_date) insertData.due_date = body.due_date
    if (body.pursuit_id) insertData.pursuit_id = body.pursuit_id
    if (body.risk_id) insertData.risk_id = body.risk_id
    if (body.description) insertData.description = body.description
    if (body.owner) insertData.owner = body.owner

    // Review queue fields (added by migration, may not exist yet)
    const reviewFields: Record<string, unknown> = {}
    if (body.needs_review !== undefined) reviewFields.needs_review = body.needs_review
    if (body.import_source) reviewFields.import_source = body.import_source
    if (body.import_batch_id) reviewFields.import_batch_id = body.import_batch_id

    // Try with review fields first, fall back without them if columns don't exist
    let result = await supabase
      .from('action_items')
      .insert({ ...insertData, ...reviewFields })
      .select()
      .single()

    // If error mentions missing column, retry without review fields
    if (result.error?.message?.includes('column') || result.error?.code === 'PGRST204') {
      result = await supabase
        .from('action_items')
        .insert(insertData)
        .select()
        .single()
    }

    if (result.error) {
      return Response.json({ error: result.error.message }, { status: 500 })
    }

    return Response.json(result.data)
  } catch (error) {
    console.error('Add action error:', error)
    return Response.json({ error: 'Failed to add action' }, { status: 500 })
  }
}
