import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HubSpotClient, HubSpotConfig } from '@/lib/hubspot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/integrations/hubspot/deals?q=search_term&limit=20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const id = searchParams.get('id') // Optional: get specific deal by ID
    const companyId = searchParams.get('company_id') // Optional: get deals for company
    const includeAssociations = searchParams.get('include_associations') === 'true'

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

    // Get specific deal by ID
    if (id) {
      try {
        const deal = await client.getDeal(id)

        let associatedContacts = null
        let associatedCompanies = null

        if (includeAssociations) {
          const [contactAssoc, companyAssoc] = await Promise.all([
            client.getDealContacts(id),
            client.getDealCompanies(id),
          ])
          associatedContacts = contactAssoc.results.map(a => a.id)
          associatedCompanies = companyAssoc.results.map(a => a.id)
        }

        return Response.json({
          success: true,
          deal: formatDeal(deal, associatedContacts, associatedCompanies),
        })
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Deal not found',
        }, { status: 404 })
      }
    }

    // Get deals for a specific company
    if (companyId) {
      try {
        const associations = await client.getCompanyDeals(companyId)
        const dealIds = associations.results.map(a => a.id)

        // Fetch full deal details for each associated deal
        const deals = await Promise.all(
          dealIds.slice(0, limit).map(async (dealId) => {
            const deal = await client.getDeal(dealId)
            return formatDeal(deal)
          })
        )

        return Response.json({
          success: true,
          deals,
          total: dealIds.length,
        })
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get company deals',
        }, { status: 500 })
      }
    }

    // Search deals
    const result = await client.searchDeals(query, limit)

    // Format response
    const deals = result.results.map(d => formatDeal(d))

    return Response.json({
      success: true,
      deals,
      total: result.total,
      has_more: !!result.paging?.next,
    })
  } catch (error) {
    console.error('HubSpot deals API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search deals',
    }, { status: 500 })
  }
}

// Helper to format deal response
function formatDeal(
  deal: { id: string; properties: Record<string, string | undefined>; createdAt: string; updatedAt: string },
  associatedContacts?: string[] | null,
  associatedCompanies?: string[] | null
) {
  return {
    id: deal.id,
    name: deal.properties.dealname || 'Untitled Deal',
    amount: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
    stage: deal.properties.dealstage || null,
    pipeline: deal.properties.pipeline || null,
    close_date: deal.properties.closedate || null,
    currency: deal.properties.deal_currency_code || 'USD',
    probability: deal.properties.hs_deal_stage_probability
      ? parseFloat(deal.properties.hs_deal_stage_probability)
      : null,
    created_at: deal.createdAt,
    updated_at: deal.updatedAt,
    associated_contact_ids: associatedContacts || null,
    associated_company_ids: associatedCompanies || null,
    _raw: deal.properties,
  }
}
