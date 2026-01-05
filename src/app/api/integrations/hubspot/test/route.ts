import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HubSpotClient, HubSpotConfig } from '@/lib/hubspot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/integrations/hubspot/test - Test HubSpot connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let accessToken = body.access_token

    // If no token provided, try to use stored one
    if (!accessToken) {
      const supabase = await createClient()
      const { data } = await supabase
        .from('company_profile')
        .select('hubspot_config')
        .limit(1)
        .single()

      const config = data?.hubspot_config as HubSpotConfig | null
      if (!config?.access_token) {
        return Response.json({
          success: false,
          error: 'No HubSpot access token configured',
        }, { status: 400 })
      }
      accessToken = config.access_token
    }

    // Test the connection
    const client = new HubSpotClient({ access_token: accessToken, enabled: true })
    const result = await client.testConnection()

    if (result.success) {
      // If test passed and we have a stored config, update the portal_id
      if (!body.access_token && result.portalId) {
        const supabase = await createClient()
        const { data } = await supabase
          .from('company_profile')
          .select('id, hubspot_config')
          .limit(1)
          .single()

        if (data?.id && data?.hubspot_config) {
          const config = data.hubspot_config as HubSpotConfig
          await supabase
            .from('company_profile')
            .update({
              hubspot_config: {
                ...config,
                portal_id: result.portalId,
              },
            })
            .eq('id', data.id)
        }
      }

      return Response.json({
        success: true,
        message: 'Connection successful',
        portalId: result.portalId,
      })
    } else {
      return Response.json({
        success: false,
        error: result.error || 'Connection failed',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('HubSpot test API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    }, { status: 500 })
  }
}
