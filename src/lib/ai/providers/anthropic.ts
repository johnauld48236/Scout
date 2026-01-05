import Anthropic from '@anthropic-ai/sdk'
import type { AIContext, ChatResponse, AISuggestion, ResearchCategory, ResearchFinding, ResearchResponse, CampaignDetails } from '../context/types'
import { getCampaignDetails, getCampaignByName } from '../context/builder'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

// Tool definitions for AI function calling
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_campaign_details',
    description: `Retrieve full details of a sales campaign including value proposition, pain points, signal triggers, and messaging context. Use this when you need detailed campaign information to:
- Provide campaign-specific messaging recommendations
- Understand target company profiles for a campaign
- Reference specific value propositions or pain points
- Help with campaign-aligned stakeholder outreach`,
    input_schema: {
      type: 'object' as const,
      properties: {
        campaign_id: {
          type: 'string',
          description: 'The campaign UUID. Use this if you know the exact campaign ID from the active campaigns context.',
        },
        campaign_name: {
          type: 'string',
          description: 'The campaign name (or partial name) to search for. Use this if you only know the campaign name.',
        },
      },
      required: [],
    },
  },
]

// Execute a tool call and return the result
async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'get_campaign_details': {
      let campaign: CampaignDetails | null = null

      if (toolInput.campaign_id) {
        campaign = await getCampaignDetails(toolInput.campaign_id as string)
      } else if (toolInput.campaign_name) {
        campaign = await getCampaignByName(toolInput.campaign_name as string)
      }

      if (!campaign) {
        return JSON.stringify({ error: 'Campaign not found' })
      }

      // Format campaign details for AI consumption
      return JSON.stringify({
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        targets: {
          verticals: campaign.target_verticals,
          geographies: campaign.target_geos,
          company_profile: campaign.target_company_profile,
        },
        messaging: {
          value_proposition: campaign.value_proposition,
          key_pain_points: campaign.key_pain_points,
          signal_triggers: campaign.signal_triggers,
        },
        context: {
          regulatory: campaign.regulatory_context,
          industry_dynamics: campaign.industry_dynamics,
        },
        timeline: {
          start_date: campaign.start_date,
          end_date: campaign.end_date,
        },
        goals: {
          pipeline_goal: campaign.pipeline_goal,
          conversion_goal: campaign.conversion_goal,
        },
        metrics: {
          current_pipeline: campaign.current_pipeline,
          pursuit_count: campaign.pursuit_count,
          account_count: campaign.account_count,
        },
      }, null, 2)
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

// Build system prompt with company context
function buildSystemPrompt(companyContext?: AIContext['company']): string {
  let prompt = `You are an AI assistant embedded in a Sales Execution Platform. Your role is to help sales teams achieve their revenue goals by providing actionable insights, recommendations, and assistance.`

  // Add company context if available
  if (companyContext?.company_name) {
    prompt += `\n\n## Your Company Context
You are assisting the sales team at ${companyContext.company_name}.`

    if (companyContext.industry) {
      prompt += `\nIndustry: ${companyContext.industry}`
    }

    if (companyContext.value_proposition) {
      prompt += `\n\nValue Proposition: ${companyContext.value_proposition}`
    }

    if (companyContext.key_differentiators) {
      prompt += `\nKey Differentiators: ${companyContext.key_differentiators}`
    }

    if (companyContext.ideal_customer_profile) {
      prompt += `\n\nIdeal Customer Profile: ${companyContext.ideal_customer_profile}`
    }

    if (companyContext.target_verticals?.length) {
      prompt += `\nTarget Verticals: ${companyContext.target_verticals.join(', ')}`
    }

    if (companyContext.products_services) {
      prompt += `\n\nProducts/Services: ${companyContext.products_services}`
    }

    if (companyContext.competitors?.length) {
      prompt += `\nKey Competitors: ${companyContext.competitors.join(', ')}`
    }

    if (companyContext.competitive_positioning) {
      prompt += `\nCompetitive Positioning: ${companyContext.competitive_positioning}`
    }

    if (companyContext.buying_triggers) {
      prompt += `\n\nBuying Triggers to Watch For: ${companyContext.buying_triggers}`
    }

    if (companyContext.key_stakeholder_roles?.length) {
      prompt += `\nKey Stakeholder Roles: ${companyContext.key_stakeholder_roles.join(', ')}`
    }

    prompt += `\n\nUse this company context to frame your analysis and recommendations. When researching or analyzing prospects, look through the lens of what makes them a good fit for ${companyContext.company_name}.`
  }

  prompt += `

## Platform Data
The platform tracks:
- Goals: Revenue targets (New ARR, Renewal, Upsell) and logo targets by vertical
- Campaigns: Vertical and thematic sales campaigns with target segments, value props, and pain points
- Account Plans: Customer accounts with pursuits, stakeholders, and action items
- Pursuits: Sales opportunities with stage tracking and BANT qualification
- Stakeholders: Contacts with role, sentiment, and engagement tracking
- TAM Intelligence: Total Addressable Market with signals and priority scoring

## Campaign Awareness
Active campaigns define the current sales focus. When you see active campaigns in context:
- **Vertical campaigns** target specific industries (evergreen)
- **Thematic campaigns** are time-bound initiatives with specific messaging and goals

Use campaign context to:
1. Identify if an account/opportunity aligns with active campaign targets
2. Suggest campaign-relevant messaging when discussing stakeholder outreach
3. Flag when accounts match campaign verticals/geos but aren't linked
4. Reference campaign value propositions and pain points in recommendations

## Response Guidelines
When responding:
1. Be concise and actionable - sales teams are busy
2. Reference specific data when available (account names, values, dates)
3. Prioritize insights that impact revenue
4. Suggest concrete next steps when appropriate
5. Use sales terminology appropriately (pipeline, BANT, close rate, etc.)
6. Frame recommendations in context of the company's ICP, value proposition, and active campaigns
7. When relevant, connect recommendations to active campaign goals

Format responses in markdown when helpful, but keep them scannable.`

  return prompt
}

// Generate chat completion with tool support
export async function generateChatResponse(
  context: AIContext,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ChatResponse> {
  const contextSummary = buildContextSummary(context)
  const systemPrompt = buildSystemPrompt(context.company)

  // Build messages with proper typing for tool use
  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: contextSummary
        ? `[Context: ${contextSummary}]\n\n${userMessage}`
        : userMessage
    }
  ]

  try {
    // Initial request with tools
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
      tools: TOOLS,
    })

    // Handle tool use loop (max 3 iterations to prevent infinite loops)
    let iterations = 0
    const maxIterations = 3

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++

      // Find tool use blocks in the response
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0) break

      // Execute each tool call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          }
        })
      )

      // Continue conversation with tool results
      const updatedMessages: Anthropic.MessageParam[] = [
        ...messages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ]

      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: updatedMessages,
        tools: TOOLS,
      })
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    const textContent = textBlocks.map(b => b.text).join('\n')

    // Parse any suggested actions from the response
    const suggestedActions = extractSuggestedActions(textContent)
    const followUpQuestions = extractFollowUpQuestions(textContent)

    return {
      conversationId: crypto.randomUUID(),
      content: textContent,
      suggestedActions,
      followUpQuestions,
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error('Failed to generate AI response')
  }
}

// Generate contextual suggestions
export async function generateSuggestions(
  context: AIContext,
  limit: number = 3
): Promise<AISuggestion[]> {
  const contextSummary = buildContextSummary(context)

  const prompt = `Based on the following context, provide ${limit} actionable suggestions for the sales team.

Context: ${contextSummary}

Respond with a JSON array of suggestions in this format:
[
  {
    "type": "insight" | "action" | "warning" | "opportunity",
    "priority": "high" | "medium" | "low",
    "title": "Brief title",
    "description": "1-2 sentence description",
    "confidence": 0-100
  }
]

Focus on the most impactful suggestions based on the current context. Only return the JSON array, no other text.`

  try {
    // Use a simple system prompt for suggestions (no company context needed for JSON output)
    const systemPrompt = `You are an AI assistant for a Sales Execution Platform. Generate actionable suggestions for sales teams based on the context provided. Always respond with valid JSON.`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '[]'

    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return []
    }

    const suggestions = JSON.parse(jsonMatch[0]) as Array<Omit<AISuggestion, 'id'>>

    return suggestions.map((s, i) => ({
      ...s,
      id: `suggestion-${Date.now()}-${i}`,
    }))
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return []
  }
}

// Stream chat response for real-time UI updates
export async function* streamChatResponse(
  context: AIContext,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): AsyncGenerator<string> {
  const contextSummary = buildContextSummary(context)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...conversationHistory,
    {
      role: 'user',
      content: contextSummary
        ? `[Context: ${contextSummary}]\n\n${userMessage}`
        : userMessage
    }
  ]

  try {
    const systemPrompt = buildSystemPrompt(context.company)

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  } catch (error) {
    console.error('Anthropic streaming error:', error)
    throw new Error('Failed to stream AI response')
  }
}

// Build a text summary of the context for the AI
function buildContextSummary(context: AIContext): string {
  const parts: string[] = []

  // Navigation context
  if (context.navigation) {
    parts.push(`Page: ${context.navigation.page}`)
    if (context.navigation.entityType && context.navigation.entityId) {
      parts.push(`Viewing: ${context.navigation.entityType} (${context.navigation.entityId})`)
    }
  }

  // Entity context
  if (context.entity?.data) {
    const entityData = context.entity.data
    const relevantFields = ['name', 'account_name', 'company_name', 'stage', 'status',
                           'target_value', 'current_value', 'estimated_value', 'priority_score']
    const summary = relevantFields
      .filter(f => entityData[f] !== undefined)
      .map(f => `${f}: ${entityData[f]}`)
      .join(', ')
    if (summary) {
      parts.push(`Entity: ${summary}`)
    }
  }

  // Platform context
  if (context.platform) {
    if (context.platform.goals?.primaryGoal) {
      const g = context.platform.goals.primaryGoal
      parts.push(`Primary Goal: ${g.name} - ${g.progressPercent}% (gap: $${(g.gap / 1000000).toFixed(1)}M)`)
    }
    if (context.platform.pipeline) {
      parts.push(`Pipeline: $${(context.platform.pipeline.totalValue / 1000000).toFixed(1)}M (${context.platform.pipeline.activeCount} active)`)
    }
    if (context.platform.alerts) {
      const a = context.platform.alerts
      if (a.overdueActionsCount > 0 || a.stalledPursuitsCount > 0) {
        parts.push(`Alerts: ${a.overdueActionsCount} overdue actions, ${a.stalledPursuitsCount} stalled pursuits`)
      }
    }
    // Active campaigns context
    if (context.platform.activeCampaigns && context.platform.activeCampaigns.length > 0) {
      const campaignSummaries = context.platform.activeCampaigns.map(c => {
        const targets = [
          ...(c.target_verticals || []),
          ...(c.target_geos || [])
        ].slice(0, 3).join(', ')
        const pipelineInfo = c.pipeline_goal
          ? ` | $${((c.current_pipeline || 0) / 1000000).toFixed(1)}M/$${(c.pipeline_goal / 1000000).toFixed(1)}M`
          : c.current_pipeline
            ? ` | $${(c.current_pipeline / 1000000).toFixed(1)}M pipeline`
            : ''
        const endInfo = c.end_date ? ` | ends ${c.end_date}` : ''
        return `${c.name} (${c.type}): ${targets}${pipelineInfo}${endInfo}`
      })
      parts.push(`Active Campaigns: ${campaignSummaries.join('; ')}`)
    }
  }

  return parts.join(' | ')
}

// Extract action suggestions from AI response (simple pattern matching)
function extractSuggestedActions(content: string): Array<{ label: string; actionType: 'navigate' | 'create'; payload?: Record<string, unknown> }> {
  const actions: Array<{ label: string; actionType: 'navigate' | 'create'; payload?: Record<string, unknown> }> = []

  // Look for common action patterns in the response
  if (content.toLowerCase().includes('create an action item') || content.toLowerCase().includes('add a task')) {
    actions.push({ label: 'Create Action Item', actionType: 'create', payload: { type: 'action_item' } })
  }
  if (content.toLowerCase().includes('view the pursuit') || content.toLowerCase().includes('check the pursuit')) {
    actions.push({ label: 'View Pursuits', actionType: 'navigate', payload: { path: '/pursuits' } })
  }
  if (content.toLowerCase().includes('tam account') || content.toLowerCase().includes('prospect')) {
    actions.push({ label: 'View TAM', actionType: 'navigate', payload: { path: '/tam' } })
  }

  return actions
}

// Extract follow-up questions from AI response
function extractFollowUpQuestions(content: string): string[] {
  const questions: string[] = []

  // Look for question marks in the response that might be suggestions
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.includes('?') && (
      line.toLowerCase().includes('would you like') ||
      line.toLowerCase().includes('do you want') ||
      line.toLowerCase().includes('should i')
    )) {
      questions.push(line.trim())
    }
  }

  return questions.slice(0, 3) // Max 3 follow-ups
}

// Research system prompt
const RESEARCH_SYSTEM_PROMPT = `You are a B2B sales research analyst. Your job is to synthesize web search results into structured, actionable intelligence for sales teams.

When analyzing search results:
1. Extract factual, verifiable information only
2. Note the confidence level based on source quality and consistency
3. Focus on information relevant to B2B sales (decision makers, budget signals, organizational structure)
4. Ignore marketing fluff - focus on substance
5. If information conflicts, note the discrepancy

Output should be structured JSON that sales teams can review and approve.`

// Research a company using web search results
export async function synthesizeResearch(
  companyName: string,
  domain: string | undefined,
  categories: ResearchCategory[],
  customPrompts: string[],
  webSearchResults: Array<{ query: string; results: string }>
): Promise<ResearchResponse> {
  const enabledCategories = categories.filter(c => c.enabled)

  const prompt = `Research the company "${companyName}"${domain ? ` (${domain})` : ''}.

Based on the following web search results, extract structured information for each category.

WEB SEARCH RESULTS:
${webSearchResults.map(r => `\n--- Query: "${r.query}" ---\n${r.results}`).join('\n\n')}

CATEGORIES TO RESEARCH:
${enabledCategories.map(c => `- ${c.name}: ${c.description}`).join('\n')}
${customPrompts.length > 0 ? `\nCUSTOM RESEARCH QUESTIONS:\n${customPrompts.map(p => `- ${p}`).join('\n')}` : ''}

Respond with a JSON object in this exact format:
{
  "findings": [
    {
      "category": "category_id",
      "categoryName": "Category Name",
      "title": "Brief finding title",
      "content": "Detailed finding content (2-4 sentences)",
      "confidence": "high" | "medium" | "low",
      "sources": ["source1", "source2"],
      "sourceUrls": ["https://example.com/article"],
      "people": [{"name": "Full Name", "title": "Job Title"}]
    }
  ],
  "summary": "2-3 sentence executive summary of key findings",
  "sourcesUsed": ["list of main sources referenced"]
}

IMPORTANT:
- For "sources", include descriptive source names (e.g., "Company Press Release", "LinkedIn")
- For "sourceUrls", include actual URLs when found in the search results (optional)
- For "people", extract any people mentioned with their name and title (optional, include when relevant)

For custom prompts, use category "custom" and include the original question in the title.
Be thorough but concise. Only return the JSON, no other text.`

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: RESEARCH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '{}'

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse research response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      findings: Array<Omit<ResearchFinding, 'id' | 'status'>>
      summary: string
      sourcesUsed: string[]
    }

    // Add IDs and default status to findings
    const findings: ResearchFinding[] = parsed.findings.map((f, i) => ({
      ...f,
      id: `finding-${Date.now()}-${i}`,
      status: 'pending' as const,
    }))

    return {
      companyName,
      domain,
      findings,
      summary: parsed.summary,
      researchedAt: new Date().toISOString(),
      sourcesUsed: parsed.sourcesUsed,
    }
  } catch (error) {
    console.error('Research synthesis error:', error)
    throw new Error('Failed to synthesize research')
  }
}

// Generate search queries for research categories
export function generateSearchQueries(
  companyName: string,
  domain: string | undefined,
  categories: ResearchCategory[],
  customPrompts: string[]
): string[] {
  const queries: string[] = []
  const enabledCategories = categories.filter(c => c.enabled)

  // Generate queries for each category
  for (const category of enabledCategories) {
    switch (category.id) {
      case 'overview':
        queries.push(`${companyName} company overview headquarters employees`)
        if (domain) queries.push(`site:${domain} about us company`)
        break
      case 'products':
        queries.push(`${companyName} products services offerings`)
        if (domain) queries.push(`site:${domain} products solutions`)
        break
      case 'divisions':
        queries.push(`${companyName} subsidiaries divisions business units brands`)
        break
      case 'leadership':
        queries.push(`${companyName} CEO leadership team executives`)
        queries.push(`${companyName} recent executive hires leadership changes`)
        break
      case 'news':
        queries.push(`${companyName} news announcements 2024 2025`)
        queries.push(`${companyName} press release recent`)
        break
      case 'financials':
        queries.push(`${companyName} funding revenue growth`)
        queries.push(`${companyName} investment acquisition`)
        break
      case 'technology':
        queries.push(`${companyName} technology stack platform`)
        queries.push(`${companyName} CRM ERP software tools`)
        break
    }
  }

  // Add custom prompt queries
  for (const prompt of customPrompts) {
    queries.push(`${companyName} ${prompt}`)
  }

  return queries
}
