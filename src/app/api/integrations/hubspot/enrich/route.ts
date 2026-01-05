import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HubSpotClient, HubSpotConfig } from '@/lib/hubspot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface EnrichRequest {
  hubspot_type: 'contact' | 'company' | 'deal'
  hubspot_id: string
  local_type: 'prospect_contact' | 'tam_account' | 'pursuit'
  local_id: string
  fields_to_import?: string[]
}

// POST /api/integrations/hubspot/enrich - Pull HubSpot data to local record
export async function POST(request: NextRequest) {
  try {
    const body: EnrichRequest = await request.json()
    const { hubspot_type, hubspot_id, local_type, local_id, fields_to_import } = body

    if (!hubspot_type || !hubspot_id || !local_type || !local_id) {
      return Response.json({
        success: false,
        error: 'Missing required fields: hubspot_type, hubspot_id, local_type, local_id',
      }, { status: 400 })
    }

    // Get HubSpot config
    const supabase = await createClient()
    const { data: configData } = await supabase
      .from('company_profile')
      .select('hubspot_config')
      .limit(1)
      .single()

    const config = configData?.hubspot_config as HubSpotConfig | null
    if (!config?.access_token || !config.enabled) {
      return Response.json({
        success: false,
        error: 'HubSpot integration not configured or disabled',
      }, { status: 400 })
    }

    const client = new HubSpotClient(config)

    // Fetch HubSpot record
    let hubspotData: Record<string, unknown> = {}

    if (hubspot_type === 'contact') {
      const contact = await client.getContact(hubspot_id)
      hubspotData = {
        full_name: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
        email: contact.properties.email,
        phone: contact.properties.phone,
        company_name: contact.properties.company,
        title: contact.properties.jobtitle,
        hubspot_contact_id: contact.id,
      }
    } else if (hubspot_type === 'company') {
      const company = await client.getCompany(hubspot_id)
      hubspotData = {
        company_name: company.properties.name,
        website: company.properties.website || company.properties.domain,
        industry: company.properties.industry,
        employee_count: company.properties.numberofemployees ? parseInt(company.properties.numberofemployees, 10) : null,
        annual_revenue: company.properties.annualrevenue ? parseFloat(company.properties.annualrevenue) : null,
        city: company.properties.city,
        state: company.properties.state,
        country: company.properties.country,
        phone: company.properties.phone,
        description: company.properties.description,
        hubspot_company_id: company.id,
      }
    } else if (hubspot_type === 'deal') {
      const deal = await client.getDeal(hubspot_id)
      hubspotData = {
        name: deal.properties.dealname,
        estimated_value: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
        target_close_date: deal.properties.closedate,
        hubspot_deal_id: deal.id,
        // Note: Stage mapping would need customization per customer
        // stage: mapHubSpotStage(deal.properties.dealstage),
      }
    }

    // Filter fields if specified
    let updateData: Record<string, unknown> = {}
    if (fields_to_import && fields_to_import.length > 0) {
      for (const field of fields_to_import) {
        if (field in hubspotData && hubspotData[field] !== undefined && hubspotData[field] !== null) {
          updateData[field] = hubspotData[field]
        }
      }
    } else {
      // Import all non-null fields
      updateData = Object.fromEntries(
        Object.entries(hubspotData).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({
        success: false,
        error: 'No data to import from HubSpot record',
      }, { status: 400 })
    }

    // Update local record based on type
    let result
    let tableName: string

    if (local_type === 'prospect_contact') {
      tableName = 'prospect_contacts'
      result = await supabase
        .from(tableName)
        .update(updateData)
        .eq('contact_id', local_id)
        .select()
        .single()
    } else if (local_type === 'tam_account') {
      tableName = 'tam_accounts'
      result = await supabase
        .from(tableName)
        .update(updateData)
        .eq('tam_account_id', local_id)
        .select()
        .single()
    } else if (local_type === 'pursuit') {
      tableName = 'pursuits'
      result = await supabase
        .from(tableName)
        .update(updateData)
        .eq('pursuit_id', local_id)
        .select()
        .single()
    } else {
      return Response.json({
        success: false,
        error: 'Invalid local_type',
      }, { status: 400 })
    }

    if (result.error) {
      console.error('Error updating local record:', result.error)
      return Response.json({
        success: false,
        error: `Failed to update ${local_type}: ${result.error.message}`,
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: `Successfully enriched ${local_type} from HubSpot ${hubspot_type}`,
      updated_fields: Object.keys(updateData),
      record: result.data,
    })
  } catch (error) {
    console.error('HubSpot enrich API error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enrich record',
    }, { status: 500 })
  }
}

// GET /api/integrations/hubspot/enrich - Preview what would be enriched
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hubspot_type = searchParams.get('hubspot_type') as 'contact' | 'company' | 'deal'
    const hubspot_id = searchParams.get('hubspot_id')
    const local_type = searchParams.get('local_type') as 'prospect_contact' | 'tam_account' | 'pursuit'
    const local_id = searchParams.get('local_id')

    if (!hubspot_type || !hubspot_id) {
      return Response.json({
        success: false,
        error: 'Missing required params: hubspot_type, hubspot_id',
      }, { status: 400 })
    }

    // Get HubSpot config
    const supabase = await createClient()
    const { data: configData } = await supabase
      .from('company_profile')
      .select('hubspot_config')
      .limit(1)
      .single()

    const config = configData?.hubspot_config as HubSpotConfig | null
    if (!config?.access_token || !config.enabled) {
      return Response.json({
        success: false,
        error: 'HubSpot integration not configured or disabled',
      }, { status: 400 })
    }

    const client = new HubSpotClient(config)

    // Fetch HubSpot record
    let hubspotRecord: Record<string, unknown> = {}

    if (hubspot_type === 'contact') {
      const contact = await client.getContact(hubspot_id)
      hubspotRecord = {
        id: contact.id,
        full_name: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
        email: contact.properties.email,
        phone: contact.properties.phone,
        company_name: contact.properties.company,
        title: contact.properties.jobtitle,
      }
    } else if (hubspot_type === 'company') {
      const company = await client.getCompany(hubspot_id)
      hubspotRecord = {
        id: company.id,
        company_name: company.properties.name,
        website: company.properties.website || company.properties.domain,
        industry: company.properties.industry,
        employee_count: company.properties.numberofemployees,
        annual_revenue: company.properties.annualrevenue,
        city: company.properties.city,
        state: company.properties.state,
        country: company.properties.country,
        phone: company.properties.phone,
        description: company.properties.description,
      }
    } else if (hubspot_type === 'deal') {
      const deal = await client.getDeal(hubspot_id)
      hubspotRecord = {
        id: deal.id,
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        stage: deal.properties.dealstage,
        close_date: deal.properties.closedate,
        pipeline: deal.properties.pipeline,
      }
    }

    // If local record specified, also fetch it for comparison
    let localRecord: Record<string, unknown> | null = null

    if (local_type && local_id) {
      if (local_type === 'prospect_contact') {
        const { data } = await supabase
          .from('prospect_contacts')
          .select('*')
          .eq('contact_id', local_id)
          .single()
        localRecord = data
      } else if (local_type === 'tam_account') {
        const { data } = await supabase
          .from('tam_accounts')
          .select('*')
          .eq('tam_account_id', local_id)
          .single()
        localRecord = data
      } else if (local_type === 'pursuit') {
        const { data } = await supabase
          .from('pursuits')
          .select('*')
          .eq('pursuit_id', local_id)
          .single()
        localRecord = data
      }
    }

    return Response.json({
      success: true,
      hubspot_record: hubspotRecord,
      local_record: localRecord,
    })
  } catch (error) {
    console.error('HubSpot enrich preview error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview enrichment',
    }, { status: 500 })
  }
}
