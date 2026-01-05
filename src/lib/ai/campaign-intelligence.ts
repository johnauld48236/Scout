import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

// Intelligence levels for progressive context
export type IntelligenceLevel = 'tam_screening' | 'account_building' | 'opportunity_mapping' | 'ongoing_monitoring'

export interface CampaignContext {
  campaign_id: string
  name: string
  type: string
  campaign_context?: string // Full markdown context
  // Fallback fields if no markdown context
  value_proposition?: string
  key_pain_points?: string
  regulatory_context?: string
  signal_triggers?: string
  target_verticals?: string[]
}

export interface CompanyContext {
  company_name: string
  value_proposition?: string
  key_differentiators?: string
  products_services?: string
  target_verticals?: string[]
  competitors?: string[]
  competitive_positioning?: string
  buying_triggers?: string
  sales_intelligence_context?: string // Full markdown context
}

export interface TargetCompany {
  company_name: string
  website?: string
  industry?: string
  vertical?: string
  employee_count?: number
  headquarters?: string
  company_summary?: string
  existing_signals?: string[]
}

export interface IntelligenceRequest {
  level: IntelligenceLevel
  campaigns: CampaignContext[]
  companyContext?: CompanyContext
  targetCompany?: TargetCompany
  webSearchResults?: Array<{ query: string; results: string }>
}

export interface TAMScreeningResult {
  fit_score: number
  fit_rationale: string
  detected_signals: Array<{
    type: string
    description: string
    source: string
    relevance: 'high' | 'medium' | 'low'
  }>
  recommended_search_queries: string[]
  priority_ranking: 'high' | 'medium' | 'low'
}

export interface AccountBuildingResult {
  thesis: string
  summary: string
  compelling_events: Array<{
    id: string
    title: string
    description: string
    urgency: 'high' | 'medium' | 'low'
    source: string
  }>
  buying_signals: Array<{
    id: string
    signal_type: string
    description: string
    strength: 'strong' | 'moderate' | 'weak'
    source: string
  }>
  risks: Array<{
    id: string
    title: string
    description: string
    severity: 'high' | 'medium' | 'low'
  }>
  pain_point_alignment: Array<{
    pain_point: string
    evidence: string
    confidence: 'high' | 'medium' | 'low'
  }>
  stakeholder_targets: Array<{
    role: string
    messaging_angle: string
    priority: 'primary' | 'secondary'
  }>
}

export interface OpportunityMappingResult {
  whitespace_opportunities: Array<{
    product_service: string
    need_identified: string
    value_fit: string
    competitive_position: string
  }>
  value_proposition_customization: string
  competitive_risks: string[]
  recommended_approach: string
}

/**
 * Build the intelligence prompt based on level and context
 */
function buildIntelligencePrompt(request: IntelligenceRequest): string {
  const { level, campaigns, companyContext, targetCompany, webSearchResults } = request

  // Build campaign context section
  let campaignSection = ''
  for (const campaign of campaigns) {
    if (campaign.campaign_context) {
      // Use full markdown context
      campaignSection += `\n### Campaign: ${campaign.name} (${campaign.type})\n${campaign.campaign_context}\n`
    } else {
      // Use structured fields as fallback
      campaignSection += `\n### Campaign: ${campaign.name} (${campaign.type})\n`
      if (campaign.value_proposition) campaignSection += `Value Proposition: ${campaign.value_proposition}\n`
      if (campaign.key_pain_points) campaignSection += `Pain Points: ${campaign.key_pain_points}\n`
      if (campaign.regulatory_context) campaignSection += `Regulatory Context: ${campaign.regulatory_context}\n`
      if (campaign.signal_triggers) campaignSection += `Signal Triggers: ${campaign.signal_triggers}\n`
    }
  }

  // Build company context section (seller's company - C2A)
  let sellerContextSection = ''
  if (companyContext) {
    if (companyContext.sales_intelligence_context) {
      sellerContextSection = `\n## YOUR COMPANY (Seller)\n${companyContext.sales_intelligence_context}\n`
    } else {
      sellerContextSection = `\n## YOUR COMPANY (Seller)\nCompany: ${companyContext.company_name}\n`
      if (companyContext.value_proposition) sellerContextSection += `Value Proposition: ${companyContext.value_proposition}\n`
      if (companyContext.products_services) sellerContextSection += `Products/Services: ${companyContext.products_services}\n`
      if (companyContext.key_differentiators) sellerContextSection += `Differentiators: ${companyContext.key_differentiators}\n`
      if (companyContext.competitive_positioning) sellerContextSection += `Competitive Positioning: ${companyContext.competitive_positioning}\n`
    }
  }

  // Build target company section
  let targetSection = ''
  if (targetCompany) {
    targetSection = `\n## TARGET COMPANY\n`
    targetSection += `Company: ${targetCompany.company_name}\n`
    if (targetCompany.website) targetSection += `Website: ${targetCompany.website}\n`
    if (targetCompany.industry) targetSection += `Industry: ${targetCompany.industry}\n`
    if (targetCompany.vertical) targetSection += `Vertical: ${targetCompany.vertical}\n`
    if (targetCompany.employee_count) targetSection += `Employees: ${targetCompany.employee_count}\n`
    if (targetCompany.headquarters) targetSection += `HQ: ${targetCompany.headquarters}\n`
    if (targetCompany.company_summary) targetSection += `Summary: ${targetCompany.company_summary}\n`
    if (targetCompany.existing_signals?.length) {
      targetSection += `Existing Signals:\n${targetCompany.existing_signals.map(s => `- ${s}`).join('\n')}\n`
    }
  }

  // Build web search results section
  let searchResultsSection = ''
  if (webSearchResults?.length) {
    searchResultsSection = `\n## WEB RESEARCH RESULTS\n`
    for (const result of webSearchResults) {
      searchResultsSection += `\n### Query: ${result.query}\n${result.results}\n`
    }
  }

  // Level-specific instructions
  let levelInstructions = ''
  let outputFormat = ''

  switch (level) {
    case 'tam_screening':
      levelInstructions = `
## YOUR TASK: TAM SCREENING (Level 1 - Broad)

You are performing initial screening of a TAM account against campaign criteria.
Focus on:
1. Does this company match the TARGET COMPANY PROFILE in the campaign context?
2. Are there HIGH-LEVEL SIGNALS visible that match campaign signal triggers?
3. How well does the company align with campaign pain points?
4. What's the overall fit for this campaign?

Be efficient - this is a screening pass, not deep research. Look for obvious signals and fit indicators.
Use the SIGNAL TRIGGERS tables in the campaign context to identify what to look for.
`
      outputFormat = `
Return JSON:
{
  "fit_score": 0-100,
  "fit_rationale": "2-3 sentence explanation of fit",
  "detected_signals": [
    {"type": "signal category", "description": "what was found", "source": "where found", "relevance": "high|medium|low"}
  ],
  "recommended_search_queries": ["queries for deeper research"],
  "priority_ranking": "high|medium|low"
}
`
      break

    case 'account_building':
      levelInstructions = `
## YOUR TASK: ACCOUNT BUILDING (Level 2 - Focused)

You are building an account profile for an account the team wants to pursue.
Use the campaign context to focus your analysis:
1. Reference the PAIN POINTS section - which apply to this company?
2. Use the SIGNAL TRIGGERS tables to categorize findings
3. Follow the RESEARCH FRAMEWORK checklist
4. Look for the specific signals described in campaign context

Build a complete account thesis:
- Why should we pursue this account? (Thesis)
- What compelling events create urgency?
- What buying signals indicate readiness?
- What risks/obstacles exist?
- Which stakeholders should we target and with what messaging?
`
      outputFormat = `
Return JSON:
{
  "thesis": "2-3 sentence compelling reason to pursue this account",
  "summary": "Executive summary of the opportunity",
  "compelling_events": [
    {"id": "uuid", "title": "event", "description": "details", "urgency": "high|medium|low", "source": "where found"}
  ],
  "buying_signals": [
    {"id": "uuid", "signal_type": "type from campaign", "description": "details", "strength": "strong|moderate|weak", "source": "where found"}
  ],
  "risks": [
    {"id": "uuid", "title": "risk", "description": "details", "severity": "high|medium|low"}
  ],
  "pain_point_alignment": [
    {"pain_point": "from campaign context", "evidence": "what we found", "confidence": "high|medium|low"}
  ],
  "stakeholder_targets": [
    {"role": "VP Product Security", "messaging_angle": "approach for this role", "priority": "primary|secondary"}
  ]
}
`
      break

    case 'opportunity_mapping':
      levelInstructions = `
## YOUR TASK: OPPORTUNITY MAPPING (Level 3 - Deep)

You are mapping opportunities within an account, using both campaign AND company context.
Focus on:
1. WHITESPACE ANALYSIS: What products/services could we sell based on their needs?
2. VALUE MAPPING: How do our specific products address their pain points?
3. COMPETITIVE POSITIONING: How do we differentiate against likely competitors?
4. APPROACH STRATEGY: How should we engage this account?

Use the seller company context (products, differentiators) to map against buyer needs.
Reference the VALUE PROPOSITION VARIATIONS in campaign context for role-specific messaging.
`
      outputFormat = `
Return JSON:
{
  "whitespace_opportunities": [
    {"product_service": "our product", "need_identified": "their need", "value_fit": "how it fits", "competitive_position": "vs alternatives"}
  ],
  "value_proposition_customization": "Customized value prop for this account",
  "competitive_risks": ["competitor threats"],
  "recommended_approach": "How to engage this account"
}
`
      break

    case 'ongoing_monitoring':
      levelInstructions = `
## YOUR TASK: ONGOING INTELLIGENCE (Continuous)

You are updating intelligence on an active account/opportunity.
Focus on:
1. NEW SIGNALS: What's changed since last update?
2. URGENCY CHANGES: Any new compelling events or timeline shifts?
3. RISK UPDATES: New obstacles or competitive threats?
4. OPPORTUNITY EXPANSION: New needs or stakeholders identified?

Reference the NEWS/EVENT TRIGGERS in campaign context for what to monitor.
`
      outputFormat = `
Return JSON with updates to existing account intelligence, flagging what's new or changed.
`
      break
  }

  return `You are a B2B sales intelligence analyst. You have deep expertise in researching companies and identifying sales opportunities.

## CAMPAIGN CONTEXT (Your Intelligence Lens)
${campaignSection}
${sellerContextSection}
${targetSection}
${searchResultsSection}

${levelInstructions}

## OUTPUT FORMAT
${outputFormat}

Be specific and actionable. Reference the campaign context throughout your analysis.
Only include findings you have evidence for. Note confidence levels honestly.
Generate unique IDs for any items that need them (use format: type-timestamp-index).`
}

/**
 * Run campaign intelligence analysis
 */
export async function runCampaignIntelligence(
  request: IntelligenceRequest
): Promise<TAMScreeningResult | AccountBuildingResult | OpportunityMappingResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const prompt = buildIntelligencePrompt(request)

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: 'You are a B2B sales intelligence analyst. Always respond with valid JSON matching the requested format.',
    messages: [{ role: 'user', content: prompt }],
  })

  // Extract text content
  const textContent = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  // Parse JSON from response
  const jsonMatch = textContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse intelligence response')
  }

  return JSON.parse(jsonMatch[0])
}

/**
 * Generate search queries based on campaign context and target company
 */
export function generateCampaignSearchQueries(
  campaign: CampaignContext,
  companyName: string,
  level: IntelligenceLevel
): string[] {
  const queries: string[] = []

  // Basic company queries
  queries.push(`${companyName} company news 2025 2026`)

  // Extract search queries from campaign context if available
  if (campaign.campaign_context) {
    // Look for recommended search query patterns
    const queryPatterns = campaign.campaign_context.match(/"\[Company\][^"]+"/g)
    if (queryPatterns) {
      for (const pattern of queryPatterns.slice(0, 6)) {
        const query = pattern.replace(/"/g, '').replace('[Company]', companyName)
        queries.push(query)
      }
    }

    // Extract key terms from pain points for search
    const painPointSection = campaign.campaign_context.match(/## CAMPAIGN PAIN POINTS[\s\S]*?(?=##|$)/i)
    if (painPointSection) {
      // Extract search signal hints
      const searchSignals = painPointSection[0].match(/\*Search signals:\*([^*]+)/g)
      if (searchSignals) {
        for (const signal of searchSignals.slice(0, 3)) {
          const terms = signal.replace('*Search signals:*', '').trim().split(',')[0]
          if (terms) queries.push(`${companyName} ${terms.trim()}`)
        }
      }
    }
  }

  // Campaign-specific queries from structured fields
  if (campaign.regulatory_context) {
    const regTerms = campaign.regulatory_context.split(' ').slice(0, 4).join(' ')
    queries.push(`${companyName} ${regTerms}`)
  }

  if (campaign.key_pain_points) {
    const painTerms = campaign.key_pain_points.split(',')[0]?.trim()
    if (painTerms) queries.push(`${companyName} ${painTerms}`)
  }

  if (campaign.signal_triggers) {
    const triggerTerms = campaign.signal_triggers.split(',')[0]?.trim()
    if (triggerTerms) queries.push(`${companyName} ${triggerTerms}`)
  }

  // Level-specific query additions
  if (level === 'tam_screening') {
    // Broad queries for initial screening
    queries.push(`${companyName} cybersecurity`)
    queries.push(`${companyName} product security`)
  } else if (level === 'account_building') {
    // Deeper queries for account building
    queries.push(`${companyName} security leadership`)
    queries.push(`${companyName} compliance regulation`)
    queries.push(`${companyName} connected devices IoT`)
  }

  // Deduplicate and limit
  return [...new Set(queries)].slice(0, 8)
}
