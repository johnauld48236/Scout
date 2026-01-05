// Wizard data types for Account Plan creation

export interface WizardStakeholder {
  id: string
  full_name: string
  title?: string
  email?: string
  linkedin_url?: string
  role_type: 'Champion' | 'Economic Buyer' | 'Technical Buyer' | 'Influencer' | 'Blocker' | 'End User' | 'Other'
  sentiment?: 'Strong Advocate' | 'Supportive' | 'Neutral' | 'Skeptical' | 'Opposed'
  notes?: string
}

export interface WizardPursuit {
  id: string
  name: string
  description?: string
  estimated_value?: number
  stage: string
  products?: string[]
  notes?: string
}

export interface WizardCompetitor {
  id: string
  name: string
  status: 'Incumbent' | 'Active' | 'Potential' | 'Displaced'
  strengths?: string
  weaknesses?: string
  strategy?: string
}

export interface WizardActionItem {
  id: string
  title: string
  description?: string
  owner?: string
  due_date?: string
  priority: 'High' | 'Medium' | 'Low'
  category: 'Research' | 'Outreach' | 'Meeting' | 'Follow-up' | 'Internal' | 'Other'
}

export interface WizardResearchFinding {
  id: string
  category: string
  categoryName: string
  title: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  status: 'pending' | 'accepted' | 'edited' | 'rejected'
  editedContent?: string
}

export interface WizardData {
  // Step 1: Account Basics
  accountName: string
  website?: string
  vertical?: string
  industry?: string
  employeeCount?: string
  headquarters?: string
  description?: string

  // Step 2: Company Research
  researchFindings: WizardResearchFinding[]
  researchSummary?: string

  // Step 3: Stakeholders
  stakeholders: WizardStakeholder[]

  // Step 4: Opportunities
  pursuits: WizardPursuit[]

  // Step 5: Competitors
  competitors: WizardCompetitor[]

  // Step 6: Strategy
  accountStrategy?: string
  keyObjectives?: string[]
  riskFactors?: string[]

  // Step 7: Actions
  actionItems: WizardActionItem[]

  // Metadata (from TAM promotion)
  tamAccountId?: string
  campaignId?: string
}

export const WIZARD_STEPS = [
  { id: 1, name: 'Account Basics', description: 'Company information' },
  { id: 2, name: 'Research', description: 'AI-powered company research' },
  { id: 3, name: 'Stakeholders', description: 'Key contacts and roles' },
  { id: 4, name: 'Opportunities', description: 'Potential pursuits' },
  { id: 5, name: 'Competitors', description: 'Competitive landscape' },
  { id: 6, name: 'Strategy', description: 'Account approach' },
  { id: 7, name: 'Actions', description: 'Next steps' },
] as const

export const DEFAULT_WIZARD_DATA: WizardData = {
  accountName: '',
  researchFindings: [],
  stakeholders: [],
  pursuits: [],
  competitors: [],
  actionItems: [],
}

export type WizardStep = typeof WIZARD_STEPS[number]['id']
