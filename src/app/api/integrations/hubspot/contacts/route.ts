import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HubSpotClient, HubSpotConfig } from '@/lib/hubspot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/integrations/hubspot/contacts?q=search_term&limit=20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const id = searchParams.get('id') // Optional: get specific contact by ID

    // Get HubSpot config
    const supabase = await createClient()
    const { data } = await supabase
      .from('company_profile')
      .select('hubspot_config')
      .limit(1)
      .single()

    const config = data?.hubspot_config as HubSpotConfig | null
    if (!config?.access_token || !config.enabled) {
      return Response.json({
        success: false,
        error: 'HubSpot integration not configured or disabled',
      }, { status: 400 })
    }

    const client = new HubSpotClient(config)

    // Get specific contact by ID
    if (id) {
      try {
        const contact = await client.getContact(id)
        return Response.json({
          success: true,
          contact,
        })
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Contact not found',
        }, { status: 404 })
      }
    }

    // Search contacts
    const result = await client.searchContacts(query, limit)

    // Format response with friendly names
    const contacts = result.results.map(c => ({
      id: c.id,
      full_name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || 'Unknown',
      email: c.properties.email || null,
      phone: c.properties.phone || null,
      company: c.properties.company || null,
      title: c.properties.jobtitle || null,
      lifecycle_stage: c.properties.lifecyclestage || null,
      lead_status: c.properties.hs_lead_status || null,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      _raw: c.properties, // Include raw properties for debugging
    }))

    return Response.json({
      success: true,
      contacts,
      total: result.total,
      has_more: !!result.paging?.next,
    })
  } catch (error) {
    console.error('HubSpot contacts API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search contacts',
    }, { status: 500 })
  }
}
