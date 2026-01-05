import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/campaigns/[id]/context - Get campaign context
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('campaign_id, name, campaign_context, context_updated_at')
    .eq('campaign_id', id)
    .single()

  if (error || !campaign) {
    return Response.json({ error: 'Campaign not found' }, { status: 404 })
  }

  return Response.json({
    campaign_id: campaign.campaign_id,
    name: campaign.name,
    campaign_context: campaign.campaign_context,
    context_updated_at: campaign.context_updated_at,
  })
}

// PUT /api/campaigns/[id]/context - Update campaign context from markdown
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { context } = body

    if (!context) {
      return Response.json({ error: 'Context is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('campaigns')
      .update({
        campaign_context: context,
        context_updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
