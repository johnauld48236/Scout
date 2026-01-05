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

    const { data, error } = await supabase
      .from('engagement_logs')
      .insert({
        account_plan_id: id,
        title: body.title,
        engagement_date: body.engagement_date,
        engagement_type: body.engagement_type || 'meeting',
        summary: body.summary || '',
        pursuit_id: body.pursuit_id || null,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    console.error('Add engagement error:', error)
    return Response.json({ error: 'Failed to add engagement' }, { status: 500 })
  }
}
