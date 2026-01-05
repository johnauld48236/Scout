import {
  HubSpotConfig,
  HubSpotContact,
  HubSpotCompany,
  HubSpotDeal,
  HubSpotSearchResponse,
  HubSpotAssociationsResponse,
} from './types'

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

export class HubSpotClient {
  private accessToken: string

  constructor(config: HubSpotConfig) {
    this.accessToken = config.access_token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${HUBSPOT_API_BASE}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `HubSpot API error: ${response.status}`)
    }

    return response.json()
  }

  // Test connection by fetching account info
  async testConnection(): Promise<{ success: boolean; portalId?: string; error?: string }> {
    try {
      const response = await this.request<{ portalId: number }>('/account-info/v3/details')
      return { success: true, portalId: String(response.portalId) }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  // Search contacts
  async searchContacts(
    query: string,
    limit: number = 20
  ): Promise<HubSpotSearchResponse<HubSpotContact>> {
    // Build filter groups - search firstname OR lastname OR email OR company
    const filterGroups = []

    if (query) {
      if (query.includes('@')) {
        // Search by email
        filterGroups.push({
          filters: [{
            propertyName: 'email',
            operator: 'CONTAINS_TOKEN',
            value: `*${query}*`,
          }],
        })
      } else {
        // Search by firstname OR lastname OR company (separate filter groups = OR)
        filterGroups.push({
          filters: [{
            propertyName: 'firstname',
            operator: 'CONTAINS_TOKEN',
            value: `*${query}*`,
          }],
        })
        filterGroups.push({
          filters: [{
            propertyName: 'lastname',
            operator: 'CONTAINS_TOKEN',
            value: `*${query}*`,
          }],
        })
        filterGroups.push({
          filters: [{
            propertyName: 'company',
            operator: 'CONTAINS_TOKEN',
            value: `*${query}*`,
          }],
        })
      }
    }

    const body = {
      filterGroups,
      properties: [
        'firstname',
        'lastname',
        'email',
        'phone',
        'company',
        'jobtitle',
        'lifecyclestage',
        'hs_lead_status',
        'createdate',
        'lastmodifieddate',
      ],
      limit,
    }

    // If no query, just list recent contacts
    if (!query) {
      delete (body as Record<string, unknown>).filterGroups
    }

    return this.request<HubSpotSearchResponse<HubSpotContact>>(
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  // Get contact by ID
  async getContact(id: string): Promise<HubSpotContact> {
    return this.request<HubSpotContact>(
      `/crm/v3/objects/contacts/${id}?properties=firstname,lastname,email,phone,company,jobtitle,lifecyclestage,hs_lead_status`
    )
  }

  // Search companies
  async searchCompanies(
    query: string,
    limit: number = 20
  ): Promise<HubSpotSearchResponse<HubSpotCompany>> {
    // Search by name OR domain
    const filterGroups = []
    if (query) {
      filterGroups.push({
        filters: [{
          propertyName: 'name',
          operator: 'CONTAINS_TOKEN',
          value: `*${query}*`,
        }],
      })
      filterGroups.push({
        filters: [{
          propertyName: 'domain',
          operator: 'CONTAINS_TOKEN',
          value: `*${query}*`,
        }],
      })
    }

    const body = {
      filterGroups,
      properties: [
        'name',
        'domain',
        'industry',
        'numberofemployees',
        'annualrevenue',
        'city',
        'state',
        'country',
        'phone',
        'website',
        'description',
        'createdate',
        'lastmodifieddate',
      ],
      limit,
    }

    if (!query) {
      delete (body as Record<string, unknown>).filterGroups
    }

    return this.request<HubSpotSearchResponse<HubSpotCompany>>(
      '/crm/v3/objects/companies/search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  // Get company by ID
  async getCompany(id: string): Promise<HubSpotCompany> {
    return this.request<HubSpotCompany>(
      `/crm/v3/objects/companies/${id}?properties=name,domain,industry,numberofemployees,annualrevenue,city,state,country,phone,website,description`
    )
  }

  // Get contacts associated with a company
  async getCompanyContacts(companyId: string): Promise<HubSpotAssociationsResponse> {
    return this.request<HubSpotAssociationsResponse>(
      `/crm/v3/objects/companies/${companyId}/associations/contacts`
    )
  }

  // Search deals
  async searchDeals(
    query: string,
    limit: number = 20
  ): Promise<HubSpotSearchResponse<HubSpotDeal>> {
    const filterGroups = query ? [{
      filters: [{
        propertyName: 'dealname',
        operator: 'CONTAINS_TOKEN',
        value: `*${query}*`,
      }],
    }] : []

    const body = {
      filterGroups,
      properties: [
        'dealname',
        'amount',
        'dealstage',
        'closedate',
        'pipeline',
        'deal_currency_code',
        'hs_deal_stage_probability',
        'createdate',
        'lastmodifieddate',
      ],
      limit,
    }

    if (!query) {
      delete (body as Record<string, unknown>).filterGroups
    }

    return this.request<HubSpotSearchResponse<HubSpotDeal>>(
      '/crm/v3/objects/deals/search',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  // Get deal by ID
  async getDeal(id: string): Promise<HubSpotDeal> {
    return this.request<HubSpotDeal>(
      `/crm/v3/objects/deals/${id}?properties=dealname,amount,dealstage,closedate,pipeline,deal_currency_code,hs_deal_stage_probability`
    )
  }

  // Get deals associated with a company
  async getCompanyDeals(companyId: string): Promise<HubSpotAssociationsResponse> {
    return this.request<HubSpotAssociationsResponse>(
      `/crm/v3/objects/companies/${companyId}/associations/deals`
    )
  }

  // Get contacts associated with a deal
  async getDealContacts(dealId: string): Promise<HubSpotAssociationsResponse> {
    return this.request<HubSpotAssociationsResponse>(
      `/crm/v3/objects/deals/${dealId}/associations/contacts`
    )
  }

  // Get company associated with a deal
  async getDealCompanies(dealId: string): Promise<HubSpotAssociationsResponse> {
    return this.request<HubSpotAssociationsResponse>(
      `/crm/v3/objects/deals/${dealId}/associations/companies`
    )
  }
}

// Helper to create client from config stored in database
export async function createHubSpotClient(
  config: HubSpotConfig | null
): Promise<HubSpotClient | null> {
  if (!config || !config.enabled || !config.access_token) {
    return null
  }
  return new HubSpotClient(config)
}
