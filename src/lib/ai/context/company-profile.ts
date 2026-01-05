// Company Profile types for AI context

export interface CompanyProfile {
  id?: string

  // Basic Company Info
  company_name: string
  industry?: string
  website?: string

  // Value Proposition
  tagline?: string
  value_proposition?: string
  key_differentiators?: string

  // Target Market
  ideal_customer_profile?: string
  target_verticals?: string[]
  target_company_sizes?: string[]
  target_geographies?: string[]

  // Products & Services
  products_services?: string
  use_cases?: string

  // Competitive Landscape
  competitors?: string[]
  competitive_positioning?: string

  // Buying Signals
  buying_triggers?: string
  qualification_criteria?: string

  // Sales Context
  typical_sales_cycle?: string
  average_deal_size?: string
  key_stakeholder_roles?: string[]
  sales_methodology?: 'BANT' | 'MEDDICC' | 'MEDDPICC' | 'SPIN' | 'Challenger' | 'Custom'
  custom_methodology_criteria?: string[]  // If methodology is 'Custom'

  // Metadata
  created_at?: string
  updated_at?: string
}

// Build AI context summary from company profile
export function buildCompanyContextForAI(profile: CompanyProfile): string {
  const parts: string[] = []

  // Company identity
  parts.push(`You are assisting the sales team at ${profile.company_name}.`)

  if (profile.industry) {
    parts.push(`Industry: ${profile.industry}`)
  }

  if (profile.tagline) {
    parts.push(`Company tagline: "${profile.tagline}"`)
  }

  // Value proposition
  if (profile.value_proposition) {
    parts.push(`\nValue Proposition: ${profile.value_proposition}`)
  }

  if (profile.key_differentiators) {
    parts.push(`Key Differentiators: ${profile.key_differentiators}`)
  }

  // Target market
  if (profile.ideal_customer_profile) {
    parts.push(`\nIdeal Customer Profile: ${profile.ideal_customer_profile}`)
  }

  if (profile.target_verticals?.length) {
    parts.push(`Target Verticals: ${profile.target_verticals.join(', ')}`)
  }

  if (profile.target_company_sizes?.length) {
    parts.push(`Target Company Sizes: ${profile.target_company_sizes.join(', ')}`)
  }

  // Products
  if (profile.products_services) {
    parts.push(`\nProducts/Services: ${profile.products_services}`)
  }

  if (profile.use_cases) {
    parts.push(`Common Use Cases: ${profile.use_cases}`)
  }

  // Competitive
  if (profile.competitors?.length) {
    parts.push(`\nKey Competitors: ${profile.competitors.join(', ')}`)
  }

  if (profile.competitive_positioning) {
    parts.push(`Competitive Positioning: ${profile.competitive_positioning}`)
  }

  // Buying signals
  if (profile.buying_triggers) {
    parts.push(`\nBuying Triggers to Watch For: ${profile.buying_triggers}`)
  }

  if (profile.qualification_criteria) {
    parts.push(`Qualification Criteria: ${profile.qualification_criteria}`)
  }

  // Sales context
  if (profile.typical_sales_cycle) {
    parts.push(`\nTypical Sales Cycle: ${profile.typical_sales_cycle}`)
  }

  if (profile.average_deal_size) {
    parts.push(`Average Deal Size: ${profile.average_deal_size}`)
  }

  if (profile.key_stakeholder_roles?.length) {
    parts.push(`Key Stakeholder Roles: ${profile.key_stakeholder_roles.join(', ')}`)
  }

  return parts.join('\n')
}

// Default empty profile
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  company_name: '',
  industry: '',
  website: '',
  tagline: '',
  value_proposition: '',
  key_differentiators: '',
  ideal_customer_profile: '',
  target_verticals: [],
  target_company_sizes: [],
  target_geographies: [],
  products_services: '',
  use_cases: '',
  competitors: [],
  competitive_positioning: '',
  buying_triggers: '',
  qualification_criteria: '',
  typical_sales_cycle: '',
  average_deal_size: '',
  key_stakeholder_roles: [],
  sales_methodology: 'BANT',
  custom_methodology_criteria: [],
}

// Sales methodology definitions
export const SALES_METHODOLOGIES = {
  BANT: {
    name: 'BANT',
    fullName: 'Budget, Authority, Need, Timeline',
    criteria: ['Budget', 'Authority', 'Need', 'Timeline'],
    description: 'Classic qualification framework focusing on budget availability, decision-making authority, business need, and purchase timeline.',
  },
  MEDDICC: {
    name: 'MEDDICC',
    fullName: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion, Competition',
    criteria: ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Identify Pain', 'Champion', 'Competition'],
    description: 'Enterprise sales methodology focusing on quantifiable value and navigating complex buying processes.',
  },
  MEDDPICC: {
    name: 'MEDDPICC',
    fullName: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Identify Pain, Champion, Competition',
    criteria: ['Metrics', 'Economic Buyer', 'Decision Criteria', 'Decision Process', 'Paper Process', 'Identify Pain', 'Champion', 'Competition'],
    description: 'Extended MEDDICC with Paper Process for procurement/legal requirements.',
  },
  SPIN: {
    name: 'SPIN',
    fullName: 'Situation, Problem, Implication, Need-Payoff',
    criteria: ['Situation', 'Problem', 'Implication', 'Need-Payoff'],
    description: 'Consultative selling framework based on asking the right questions.',
  },
  Challenger: {
    name: 'Challenger',
    fullName: 'Teach, Tailor, Take Control',
    criteria: ['Teaching Insight', 'Tailored Message', 'Taking Control'],
    description: 'Approach based on challenging customer thinking with unique insights.',
  },
  Custom: {
    name: 'Custom',
    fullName: 'Custom Methodology',
    criteria: [],
    description: 'Define your own qualification criteria.',
  },
} as const

export type SalesMethodologyType = keyof typeof SALES_METHODOLOGIES
