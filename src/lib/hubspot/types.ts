// HubSpot API Types

export interface HubSpotConfig {
  access_token: string
  portal_id?: string
  enabled: boolean
  last_synced?: string
}

export interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    company?: string
    jobtitle?: string
    lifecyclestage?: string
    hs_lead_status?: string
    createdate?: string
    lastmodifieddate?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotCompany {
  id: string
  properties: {
    name?: string
    domain?: string
    industry?: string
    numberofemployees?: string
    annualrevenue?: string
    city?: string
    state?: string
    country?: string
    phone?: string
    website?: string
    description?: string
    createdate?: string
    lastmodifieddate?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotDeal {
  id: string
  properties: {
    dealname?: string
    amount?: string
    dealstage?: string
    closedate?: string
    pipeline?: string
    deal_currency_code?: string
    hs_deal_stage_probability?: string
    createdate?: string
    lastmodifieddate?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotSearchResponse<T> {
  total: number
  results: T[]
  paging?: {
    next?: {
      after: string
      link: string
    }
  }
}

export interface HubSpotError {
  status: string
  message: string
  correlationId: string
  category: string
}

export interface HubSpotAssociation {
  id: string
  type: string
}

export interface HubSpotAssociationsResponse {
  results: HubSpotAssociation[]
  paging?: {
    next?: {
      after: string
      link: string
    }
  }
}
