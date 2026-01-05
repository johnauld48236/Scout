// Navigation context - where the user is in the app
export interface NavigationContext {
  page: 'dashboard' | 'goals' | 'campaigns' | 'accounts' | 'pursuits' | 'stakeholders' | 'actions' | 'tam' | 'tam-gaps' | 'tam-list' | 'other'
  entityType?: 'goal' | 'campaign' | 'account_plan' | 'pursuit' | 'stakeholder' | 'action_item' | 'tam_account'
  entityId?: string
  subContext?: string // e.g., 'bant_analysis', 'stakeholder_mapping'
}

// Entity data that gets enriched server-side
export interface EntityContext {
  type: string
  id: string
  data: Record<string, unknown>
  related?: Record<string, unknown[]>
}

// Active campaign summary for AI context (lightweight)
export interface ActiveCampaignSummary {
  campaign_id: string
  name: string
  type: 'Vertical' | 'Thematic'
  status: string
  target_verticals?: string[]
  target_geos?: string[]
  pipeline_goal?: number
  current_pipeline?: number
  pursuit_count?: number
  // For thematic campaigns
  end_date?: string
}

// Full campaign details for on-demand retrieval
export interface CampaignDetails {
  campaign_id: string
  name: string
  type: 'Vertical' | 'Thematic'
  status: string
  target_verticals?: string[]
  target_geos?: string[]
  target_company_profile?: string
  value_proposition?: string
  key_pain_points?: string
  signal_triggers?: string
  regulatory_context?: string
  industry_dynamics?: string
  start_date?: string
  end_date?: string
  pipeline_goal?: number
  conversion_goal?: number
  // Computed metrics
  current_pipeline?: number
  pursuit_count?: number
  account_count?: number
}

// Platform-wide context for AI awareness
export interface PlatformContext {
  goals?: {
    primaryGoal?: {
      name: string
      target: number
      current: number
      gap: number
      progressPercent: number
    }
    atRiskCount: number
    onTrackCount: number
  }
  pipeline?: {
    totalValue: number
    activeCount: number
    stalledCount: number
    weightedValue: number
  }
  alerts?: {
    overdueActionsCount: number
    stalledPursuitsCount: number
    atRiskGoalsCount: number
  }
  activeCampaigns?: ActiveCampaignSummary[]
}

// Company profile for AI context
export interface CompanyContext {
  company_name: string
  industry?: string
  value_proposition?: string
  key_differentiators?: string
  ideal_customer_profile?: string
  target_verticals?: string[]
  products_services?: string
  competitors?: string[]
  competitive_positioning?: string
  buying_triggers?: string
  key_stakeholder_roles?: string[]
}

// Full context sent to AI
export interface AIContext {
  navigation: NavigationContext
  entity?: EntityContext
  platform?: PlatformContext
  company?: CompanyContext
  userQuery?: string
  conversationHistory?: ConversationMessage[]
}

// Chat/conversation types
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Suggestion types
export interface AISuggestion {
  id: string
  type: 'insight' | 'action' | 'warning' | 'opportunity'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  confidence: number // 0-100
  actions?: SuggestionAction[]
  source?: string // What data drove this suggestion
}

export interface SuggestionAction {
  label: string
  actionType: 'navigate' | 'create' | 'update' | 'draft' | 'dismiss'
  payload?: Record<string, unknown>
}

// Alert types
export interface AIAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  category: 'goal' | 'pipeline' | 'engagement' | 'timing' | 'risk'
  title: string
  description: string
  affectedEntities?: Array<{ type: string; id: string; name: string }>
  recommendedActions?: SuggestionAction[]
  dismissable: boolean
  expiresAt?: string
}

// API Response types
export interface SuggestionsResponse {
  suggestions: AISuggestion[]
  metadata: {
    generatedAt: string
    contextHash: string
  }
}

export interface ChatResponse {
  conversationId: string
  content: string
  suggestedActions?: SuggestionAction[]
  relatedEntities?: Array<{ type: string; id: string; name: string }>
  followUpQuestions?: string[]
}

export interface AlertsResponse {
  alerts: AIAlert[]
}

// Request types
export interface SuggestionsRequest {
  context: NavigationContext
  limit?: number
}

export interface ChatRequest {
  message: string
  context: AIContext
  conversationId?: string
}

// Research types - for external account research
export interface ResearchCategory {
  id: string
  name: string
  description: string
  enabled: boolean
  prompts: string[] // Specific things to look for in this category
}

export const DEFAULT_RESEARCH_CATEGORIES: ResearchCategory[] = [
  {
    id: 'overview',
    name: 'Company Overview',
    description: 'Basic company info, structure, headquarters, employee count',
    enabled: true,
    prompts: ['company description', 'headquarters location', 'employee count', 'year founded']
  },
  {
    id: 'products',
    name: 'Products & Services',
    description: 'What they sell, key offerings, target markets',
    enabled: true,
    prompts: ['main products', 'services offered', 'target markets', 'key solutions']
  },
  {
    id: 'divisions',
    name: 'Business Divisions',
    description: 'Subsidiaries, business units, divisions',
    enabled: true,
    prompts: ['business units', 'subsidiaries', 'divisions', 'brands owned']
  },
  {
    id: 'leadership',
    name: 'Key People',
    description: 'Leadership team, key decision makers, recent hires',
    enabled: true,
    prompts: ['CEO', 'leadership team', 'key executives', 'recent executive hires']
  },
  {
    id: 'news',
    name: 'Recent News',
    description: 'Press releases, announcements, market news from last 6 months',
    enabled: true,
    prompts: ['recent news', 'press releases', 'announcements', 'market developments']
  },
  {
    id: 'financials',
    name: 'Financial Signals',
    description: 'Funding, revenue signals, growth indicators',
    enabled: false,
    prompts: ['funding rounds', 'revenue', 'growth', 'financial news']
  },
  {
    id: 'technology',
    name: 'Technology Stack',
    description: 'Known technologies, platforms, systems they use',
    enabled: false,
    prompts: ['technology stack', 'platforms used', 'CRM', 'ERP systems']
  }
]

export interface ResearchRequest {
  companyName: string
  domain?: string // Company website domain
  categories: ResearchCategory[]
  customPrompts?: string[] // Additional user-specified research questions
}

export interface ResearchFinding {
  id: string
  category: string
  categoryName: string
  title: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  sourceUrls?: string[]
  people?: Array<{ name: string; title?: string }>
  status: 'pending' | 'accepted' | 'edited' | 'rejected'
  editedContent?: string
}

export interface ResearchResponse {
  companyName: string
  domain?: string
  findings: ResearchFinding[]
  summary: string
  researchedAt: string
  sourcesUsed: string[]
}
