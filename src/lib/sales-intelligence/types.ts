/**
 * Sales Intelligence Types
 *
 * Hierarchical data structure for AI context enrichment.
 * Designed for progressive disclosure UI and efficient token usage.
 */

// ============================================
// TARGET MARKET
// ============================================

export interface TargetMarket {
  ideal_customer_profile?: string  // Free-form ICP description
  target_verticals: string[]       // e.g., ["Medical", "Automotive", "Industrial"]
  target_company_sizes: string[]   // e.g., ["Enterprise", "Mid-Market"]
  target_geographies: string[]     // e.g., ["North America", "Europe"]
  buying_triggers: string[]        // What indicates they're ready to buy
}

// ============================================
// VALUE PROPOSITION
// ============================================

export interface ValueProposition {
  core_value_prop?: string         // Main value proposition statement
  key_differentiators: string[]    // What makes us different
  pain_points_addressed: string[]  // Problems we solve
}

// ============================================
// MARKET CONTEXT
// ============================================

export interface Regulation {
  id: string
  name: string
  description?: string
  deadline?: string  // ISO date - urgency auto-calculated
  status: 'upcoming' | 'active' | 'enforced'
  impact?: string
  verticals?: string[]  // Which verticals this applies to
}

export interface MarketContext {
  regulations: Regulation[]
  industry_dynamics?: string  // Free-form trends, pressures
  timing_factors?: string[]   // e.g., "Budget cycles in Q4", "Buying freezes in Dec"
}

// ============================================
// COMPETITIVE LANDSCAPE
// ============================================

export interface Competitor {
  id: string
  name: string
  positioning?: string       // How we position against them
  strengths?: string[]
  weaknesses?: string[]
  displacement_strategy?: string  // How to unseat them
}

export interface CompetitiveLandscape {
  competitors: Competitor[]
  differentiation: string[]      // Our key differentiators (compact list)
  common_objections?: Array<{
    objection: string
    response: string
  }>
}

// ============================================
// CUSTOMER EVIDENCE
// ============================================

export interface ProofPoint {
  id: string
  claim: string           // What we claim (e.g., "75% faster")
  evidence: string        // Supporting evidence
  source?: string         // Where this came from
  verticals?: string[]    // Which verticals this applies to
  category: 'speed' | 'cost' | 'quality' | 'risk' | 'integration' | 'other'
}

export interface CustomerStory {
  id: string
  customer?: string       // Customer name (if referenceable)
  outcome: string         // What they achieved
  quote?: string          // Direct quote if available
  verticals?: string[]
  is_public: boolean      // Can we name them?
}

export interface CustomerEvidence {
  proof_points: ProofPoint[]
  customer_stories: CustomerStory[]
  evidence_gaps?: string[]  // What we need to collect
}

// ============================================
// SALES SIGNALS
// ============================================

export interface SalesSignals {
  positive_indicators: string[]   // Buying signals
  disqualifiers: Array<{
    id: string
    signal: string
    category: 'competitive' | 'organizational' | 'scale' | 'timing' | 'behavioral'
    severity: 'hard' | 'soft'  // Hard = exclude, Soft = deprioritize
  }>
  urgency_triggers?: string[]     // Time-sensitive indicators
}

// ============================================
// ROOT STRUCTURE
// ============================================

export interface SalesIntelligence {
  target_market: TargetMarket
  value_proposition: ValueProposition
  market_context: MarketContext
  competitive: CompetitiveLandscape
  evidence: CustomerEvidence
  signals: SalesSignals

  // Metadata
  last_updated?: string
  version?: number
}

// ============================================
// DEFAULT EMPTY STATE
// ============================================

export const DEFAULT_SALES_INTELLIGENCE: SalesIntelligence = {
  target_market: {
    ideal_customer_profile: '',
    target_verticals: [],
    target_company_sizes: [],
    target_geographies: [],
    buying_triggers: [],
  },
  value_proposition: {
    core_value_prop: '',
    key_differentiators: [],
    pain_points_addressed: [],
  },
  market_context: {
    regulations: [],
    industry_dynamics: '',
    timing_factors: [],
  },
  competitive: {
    competitors: [],
    differentiation: [],
    common_objections: [],
  },
  evidence: {
    proof_points: [],
    customer_stories: [],
    evidence_gaps: [],
  },
  signals: {
    positive_indicators: [],
    disqualifiers: [],
    urgency_triggers: [],
  },
}

// ============================================
// URGENCY CALCULATION
// ============================================

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'

export function calculateUrgency(deadline: string | undefined): UrgencyLevel {
  if (!deadline) return 'none'

  const now = new Date()
  const deadlineDate = new Date(deadline)
  const monthsAway = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)

  if (monthsAway < 0) return 'none'  // Past deadline
  if (monthsAway < 6) return 'critical'
  if (monthsAway < 12) return 'high'
  if (monthsAway < 24) return 'medium'
  return 'low'
}

export function getUrgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case 'critical': return '#dc2626'  // red-600
    case 'high': return '#ea580c'      // orange-600
    case 'medium': return '#ca8a04'    // yellow-600
    case 'low': return '#16a34a'       // green-600
    default: return '#6b7280'          // gray-500
  }
}

export function getUrgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case 'critical': return 'Critical (<6 months)'
    case 'high': return 'High (6-12 months)'
    case 'medium': return 'Medium (12-24 months)'
    case 'low': return 'Low (>24 months)'
    default: return 'No deadline'
  }
}

// ============================================
// AI CONTEXT HELPERS
// ============================================

/**
 * Generate compact summary for system prompt injection
 * Keeps token count low while preserving critical info
 */
export function generateCompactSummary(intel: SalesIntelligence): string {
  const parts: string[] = []

  // Target verticals
  if (intel.target_market?.target_verticals?.length > 0) {
    parts.push('Target Verticals: ' + intel.target_market.target_verticals.join(', '))
  }

  // Key differentiators
  const differentiators = intel.value_proposition?.key_differentiators || intel.competitive?.differentiation || []
  if (differentiators.length > 0) {
    parts.push('Differentiators: ' + differentiators.slice(0, 3).join('; '))
  }

  // Active regulations with urgency
  const urgentRegs = (intel.market_context?.regulations || [])
    .filter(r => r.deadline && calculateUrgency(r.deadline) !== 'none')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3)

  if (urgentRegs.length > 0) {
    parts.push('Regulatory Deadlines: ' + urgentRegs.map(r =>
      `${r.name} (${r.deadline}, ${calculateUrgency(r.deadline)})`
    ).join('; '))
  }

  // Hard disqualifiers
  const hardDisqualifiers = (intel.signals?.disqualifiers || [])
    .filter(d => d.severity === 'hard')
    .map(d => d.signal)
    .slice(0, 5)

  if (hardDisqualifiers.length > 0) {
    parts.push('Disqualifiers: ' + hardDisqualifiers.join('; '))
  }

  return parts.join(' | ')
}

/**
 * Generate detailed context for tool retrieval
 */
export function generateDetailedContext(intel: SalesIntelligence, section?: keyof SalesIntelligence): string {
  if (section) {
    return JSON.stringify(intel[section], null, 2)
  }
  return JSON.stringify(intel, null, 2)
}
