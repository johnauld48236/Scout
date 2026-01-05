import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HubSpotClient, HubSpotConfig } from '@/lib/hubspot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/integrations/hubspot/companies?q=search_term&limit=20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const id = searchParams.get('id') // Optional: get specific company by ID
    const includeContacts = searchParams.get('include_contacts') === 'true'

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

    // Get specific company by ID
    if (id) {
      try {
        const company = await client.getCompany(id)

        let associatedContacts = null
        if (includeContacts) {
          const associations = await client.getCompanyContacts(id)
          associatedContacts = associations.results.map(a => a.id)
        }

        return Response.json({
          success: true,
          company: {
            id: company.id,
            name: company.properties.name || 'Unknown',
            domain: company.properties.domain || null,
            industry: company.properties.industry || null,
            employee_count: company.properties.numberofemployees ? parseInt(company.properties.numberofemployees, 10) : null,
            annual_revenue: company.properties.annualrevenue ? parseFloat(company.properties.annualrevenue) : null,
            city: company.properties.city || null,
            state: company.properties.state || null,
            country: company.properties.country || null,
            phone: company.properties.phone || null,
            website: company.properties.website || null,
            description: company.properties.description || null,
            created_at: company.createdAt,
            updated_at: company.updatedAt,
            associated_contact_ids: associatedContacts,
            _raw: company.properties,
          },
        })
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Company not found',
        }, { status: 404 })
      }
    }

    // Search companies
    const result = await client.searchCompanies(query, limit)

    // Format response with friendly names
    const companies = result.results.map(c => ({
      id: c.id,
      name: c.properties.name || 'Unknown',
      domain: c.properties.domain || null,
      industry: c.properties.industry || null,
      employee_count: c.properties.numberofemployees ? parseInt(c.properties.numberofemployees, 10) : null,
      annual_revenue: c.properties.annualrevenue ? parseFloat(c.properties.annualrevenue) : null,
      city: c.properties.city || null,
      state: c.properties.state || null,
      country: c.properties.country || null,
      phone: c.properties.phone || null,
      website: c.properties.website || null,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      _raw: c.properties,
    }))

    return Response.json({
      success: true,
      companies,
      total: result.total,
      has_more: !!result.paging?.next,
    })
  } catch (error) {
    console.error('HubSpot companies API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search companies',
    }, { status: 500 })
  }
}
