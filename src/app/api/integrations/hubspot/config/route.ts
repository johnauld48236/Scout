import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { HubSpotConfig } from '@/lib/hubspot/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/integrations/hubspot/config - Get HubSpot configuration
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('company_profile')
      .select('hubspot_config')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading HubSpot config:', error)
      return Response.json({ error: 'Failed to load HubSpot configuration' }, { status: 500 })
    }

    // Mask the access token for security
    const config = data?.hubspot_config as HubSpotConfig | null
    if (config?.access_token) {
      config.access_token = config.access_token.slice(0, 8) + '...' + config.access_token.slice(-4)
    }

    return Response.json({
      success: true,
      config: config || { enabled: false },
      hasToken: !!(data?.hubspot_config as HubSpotConfig)?.access_token,
    })
  } catch (error) {
    console.error('HubSpot config API error:', error)
    return Response.json({ error: 'Failed to load HubSpot configuration' }, { status: 500 })
  }
}

// POST /api/integrations/hubspot/config - Save HubSpot configuration
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const hubspotConfig: HubSpotConfig = {
      access_token: body.access_token,
      portal_id: body.portal_id || undefined,
      enabled: body.enabled ?? true,
      last_synced: body.last_synced || undefined,
    }

    // Check if company_profile exists
    const { data: existing } = await supabase
      .from('company_profile')
      .select('id, hubspot_config')
      .limit(1)
      .single()

    let result

    if (existing?.id) {
      // If access_token not provided, keep the existing one
      if (!body.access_token && existing.hubspot_config) {
        hubspotConfig.access_token = (existing.hubspot_config as HubSpotConfig).access_token
      }

      // Update existing profile with hubspot_config
      result = await supabase
        .from('company_profile')
        .update({ hubspot_config: hubspotConfig })
        .eq('id', existing.id)
        .select('hubspot_config')
        .single()
    } else {
      // Create new profile with just hubspot_config
      result = await supabase
        .from('company_profile')
        .insert({
          company_name: 'My Company', // Required field, can be updated later
          hubspot_config: hubspotConfig,
        })
        .select('hubspot_config')
        .single()
    }

    if (result.error) {
      console.error('Error saving HubSpot config:', result.error)
      return Response.json({ error: 'Failed to save HubSpot configuration' }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'HubSpot configuration saved',
    })
  } catch (error) {
    console.error('HubSpot config API error:', error)
    return Response.json({ error: 'Failed to save HubSpot configuration' }, { status: 500 })
  }
}

// DELETE /api/integrations/hubspot/config - Remove HubSpot configuration
export async function DELETE() {
  try {
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('company_profile')
      .select('id')
      .limit(1)
      .single()

    if (existing?.id) {
      await supabase
        .from('company_profile')
        .update({ hubspot_config: null })
        .eq('id', existing.id)
    }

    return Response.json({
      success: true,
      message: 'HubSpot configuration removed',
    })
  } catch (error) {
    console.error('HubSpot config API error:', error)
    return Response.json({ error: 'Failed to remove HubSpot configuration' }, { status: 500 })
  }
}
