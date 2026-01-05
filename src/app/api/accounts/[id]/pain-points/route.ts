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

    console.log('[pain-points API] Received request for account:', id)
    console.log('[pain-points API] Body:', JSON.stringify(body, null, 2))

    // Build insert object with only valid fields
    const insertData: Record<string, unknown> = {
      account_plan_id: id,
      description: body.description,
      severity: body.severity || 'significant',
    }

    // Add optional fields only if they have values
    if (body.source) insertData.source_type = body.source
    if (body.stakeholder_id) insertData.stakeholder_id = body.stakeholder_id
    if (body.pursuit_id) insertData.pursuit_id = body.pursuit_id
    if (body.engagement_id) insertData.engagement_log_id = body.engagement_id
    if (body.target_date) insertData.target_date = body.target_date
    if (body.source_date) insertData.source_date = body.source_date

    // Review queue fields (added by migration, may not exist yet)
    const reviewFields: Record<string, unknown> = {}
    if (body.needs_review !== undefined) reviewFields.needs_review = body.needs_review
    if (body.import_source) reviewFields.import_source = body.import_source
    if (body.import_batch_id) reviewFields.import_batch_id = body.import_batch_id

    console.log('[pain-points API] Insert data:', JSON.stringify(insertData, null, 2))
    console.log('[pain-points API] Review fields:', JSON.stringify(reviewFields, null, 2))

    // Try with review fields first, fall back without them if columns don't exist
    let result = await supabase
      .from('pain_points')
      .insert({ ...insertData, ...reviewFields })
      .select()
      .single()

    console.log('[pain-points API] First insert result:', result.error ? `Error: ${result.error.message}` : 'Success')

    // If error mentions missing column, retry without review fields
    if (result.error?.message?.includes('column') || result.error?.code === 'PGRST204') {
      console.log('[pain-points API] Retrying without review fields...')
      result = await supabase
        .from('pain_points')
        .insert(insertData)
        .select()
        .single()
      console.log('[pain-points API] Retry result:', result.error ? `Error: ${result.error.message}` : 'Success')
    }

    if (result.error) {
      console.log('[pain-points API] Final error:', result.error)
      return Response.json({ error: result.error.message }, { status: 500 })
    }

    console.log('[pain-points API] Created pain point:', result.data?.pain_point_id)
    return Response.json(result.data)
  } catch (error) {
    console.error('Add pain point error:', error)
    return Response.json({ error: 'Failed to add pain point' }, { status: 500 })
  }
}
