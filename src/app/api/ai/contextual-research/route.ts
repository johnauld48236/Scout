import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { generateCampaignSearchQueries, type CampaignContext } from '@/lib/ai/campaign-intelligence'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Campaign {
  campaign_id: string
  name: string
  type: string
  campaign_context?: string // Full markdown context
  value_proposition?: string
  key_pain_points?: string
  regulatory_context?: string
  signal_triggers?: string
  industry_dynamics?: string
  target_verticals?: string[]
}

interface ContextualResearchRequest {
  companyName: string
  domain?: string
  vertical?: string
  campaign_ids?: string[] // IDs to fetch from DB with full context
  campaigns?: Campaign[] // Direct campaign data (fallback)
}

// Simple web search using DuckDuckGo
async function performWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    if (!response.ok) return `No results for: ${query}`

    const html = await response.text()
    const results: string[] = []

    // Extract snippets
    const snippetRegex = /<a class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g
    let match
    while ((match = snippetRegex.exec(html)) !== null) {
      const snippet = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
      if (snippet) results.push(snippet)
    }

    return results.slice(0, 8).join('\n\n') || `No results for: ${query}`
  } catch {
    return `Search failed for: ${query}`
  }
}

// POST /api/ai/contextual-research - Research with campaign context
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: ContextualResearchRequest = await request.json()
    const { companyName, domain, vertical, campaign_ids, campaigns: providedCampaigns = [] } = body

    if (!companyName?.trim()) {
      return Response.json({ error: 'Company name is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch campaigns with full context if IDs provided
    let campaigns: Campaign[] = providedCampaigns
    if (campaign_ids?.length) {
      const { data: dbCampaigns } = await supabase
        .from('campaigns')
        .select('*')
        .in('campaign_id', campaign_ids)

      if (dbCampaigns?.length) {
        campaigns = dbCampaigns
      }
    }

    // Get company context from settings (seller context - C2A)
    const { data: profile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    // Build context-aware search queries using campaign intelligence
    const searchQueries: string[] = []

    // Add base queries
    searchQueries.push(`${companyName} company news 2025 2026`)
    if (vertical) searchQueries.push(`${companyName} ${vertical} industry`)

    // Use campaign context to generate smart search queries
    for (const campaign of campaigns) {
      const campaignContext: CampaignContext = {
        campaign_id: campaign.campaign_id,
        name: campaign.name,
        type: campaign.type,
        campaign_context: campaign.campaign_context,
        value_proposition: campaign.value_proposition,
        key_pain_points: campaign.key_pain_points,
        regulatory_context: campaign.regulatory_context,
        signal_triggers: campaign.signal_triggers,
        target_verticals: campaign.target_verticals,
      }
      const campaignQueries = generateCampaignSearchQueries(campaignContext, companyName, 'account_building')
      searchQueries.push(...campaignQueries)
    }

    // Deduplicate and limit queries
    const uniqueQueries = [...new Set(searchQueries)].slice(0, 8)

    // Perform searches using the smart queries
    const searchPromises = uniqueQueries.map(async (query) => {
      const results = await performWebSearch(query)
      return { query, results }
    })

    const webSearchResults = await Promise.all(searchPromises)

    // Build the synthesis prompt with full context
    // Use full markdown context if available, otherwise structured fields
    let campaignContextSection = ''
    if (campaigns.length > 0) {
      for (const c of campaigns) {
        if (c.campaign_context) {
          // Use full markdown context
          campaignContextSection += `\n### Campaign: ${c.name} (${c.type})\n${c.campaign_context}\n`
        } else {
          // Fallback to structured fields
          campaignContextSection += `
Campaign: ${c.name} (${c.type})
- Value Proposition: ${c.value_proposition || 'Not specified'}
- Key Pain Points: ${c.key_pain_points || 'Not specified'}
- Regulatory Context: ${c.regulatory_context || 'Not specified'}
- Signal Triggers: ${c.signal_triggers || 'Not specified'}
`
        }
      }
    } else {
      campaignContextSection = 'No specific campaign selected'
    }

    // Build company context - use full markdown if available
    let companyContext = ''
    if (profile) {
      if (profile.sales_intelligence_context) {
        companyContext = `## YOUR COMPANY CONTEXT\n${profile.sales_intelligence_context}`
      } else {
        companyContext = `
Our Company: ${profile.company_name || 'Not specified'}
Our Value Proposition: ${profile.value_proposition || 'Not specified'}
Our Key Differentiators: ${profile.key_differentiators || 'Not specified'}
Our Target Verticals: ${(profile.target_verticals || []).join(', ') || 'Not specified'}
Buying Triggers We Look For: ${profile.buying_triggers || 'Not specified'}
`
      }
    } else {
      companyContext = 'No company context available'
    }

    const synthesisPrompt = `You are a sales intelligence analyst researching a prospective customer.

${companyContext}

## CAMPAIGN CONTEXT (Your Intelligence Lens)
${campaignContextSection}

## Target Company
Company: ${companyName}
Website: ${domain || 'Unknown'}
Industry/Vertical: ${vertical || 'Unknown'}

## Web Research Results
${webSearchResults.map(r => `Query: ${r.query}\nResults: ${r.results}`).join('\n\n')}

## Your Task
Analyze the research results and identify:
1. **Compelling Events** - Regulatory deadlines, market changes, company events that create urgency
2. **Buying Signals** - Indicators that suggest they need our solution (based on campaign pain points)
3. **Potential Risks** - Challenges or obstacles to pursuing this account
4. **Alignment** - How does this company align with our campaign focus and value proposition?

Generate a JSON response with:
{
  "summary": "2-3 sentence overview of the opportunity",
  "thesis": "Why we should pursue this account - the core opportunity statement",
  "findings": [
    {
      "id": "unique-id",
      "categoryId": "category-identifier",
      "categoryName": "Human readable category",
      "title": "Finding title",
      "content": "Detailed finding content",
      "confidence": "high|medium|low",
      "sources": ["source1", "source2"]
    }
  ]
}

Categories should include:
- "regulatory_pressure" for compliance/regulatory findings
- "market_signal" for market/industry trends
- "buying_indicator" for purchase intent signals
- "risk_factor" for potential obstacles
- "strategic_alignment" for alignment with our offering

Focus on findings that relate to our campaign context and company value proposition.
Be specific and actionable. Only include high-confidence findings from the research.`

    // Call AI to synthesize
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: 'You are a B2B sales research analyst. Synthesize web search results into structured, actionable intelligence for sales teams. Always respond with valid JSON.',
      messages: [{ role: 'user', content: synthesisPrompt }],
    })

    // Extract text content from the response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    // Parse the response
    let research
    try {
      // Extract JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON in response')
      }
    } catch {
      // If parsing fails, create a basic structure
      research = {
        summary: textContent.substring(0, 500),
        thesis: '',
        findings: []
      }
    }

    // Ensure findings have unique IDs
    if (research.findings) {
      research.findings = research.findings.map((f: Record<string, unknown>, i: number) => ({
        ...f,
        id: f.id || `finding-${Date.now()}-${i}`,
      }))
    }

    return Response.json({
      success: true,
      research
    })
  } catch (error) {
    console.error('Contextual research error:', error)
    return Response.json(
      { error: 'Failed to complete research' },
      { status: 500 }
    )
  }
}
