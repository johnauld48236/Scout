import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  runCampaignIntelligence,
  generateCampaignSearchQueries,
  type IntelligenceLevel,
  type CampaignContext,
  type CompanyContext,
  type TargetCompany,
} from '@/lib/ai/campaign-intelligence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    return results.slice(0, 6).join('\n\n') || `No results for: ${query}`
  } catch {
    return `Search failed for: ${query}`
  }
}

interface TAMIntelligenceRequest {
  tam_account_id: string
  campaign_ids: string[]
  level: IntelligenceLevel
}

// POST /api/ai/tam-intelligence - Run campaign intelligence on a TAM account
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: TAMIntelligenceRequest = await request.json()
    const { tam_account_id, campaign_ids, level = 'tam_screening' } = body

    if (!tam_account_id) {
      return Response.json({ error: 'tam_account_id is required' }, { status: 400 })
    }

    if (!campaign_ids?.length) {
      return Response.json({ error: 'At least one campaign_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch TAM account
    const { data: tamAccount, error: tamError } = await supabase
      .from('tam_accounts')
      .select('*')
      .eq('tam_account_id', tam_account_id)
      .single()

    if (tamError || !tamAccount) {
      return Response.json({ error: 'TAM account not found' }, { status: 404 })
    }

    // Fetch campaigns with context
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .in('campaign_id', campaign_ids)

    if (campaignError || !campaigns?.length) {
      return Response.json({ error: 'Campaigns not found' }, { status: 404 })
    }

    // Fetch company profile for seller context
    const { data: companyProfile } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    // Build campaign contexts
    const campaignContexts: CampaignContext[] = campaigns.map(c => ({
      campaign_id: c.campaign_id,
      name: c.name,
      type: c.type,
      campaign_context: c.campaign_context,
      value_proposition: c.value_proposition,
      key_pain_points: c.key_pain_points,
      regulatory_context: c.regulatory_context,
      signal_triggers: c.signal_triggers,
      target_verticals: c.target_verticals,
    }))

    // Build company context (seller - C2A)
    const companyContext: CompanyContext | undefined = companyProfile ? {
      company_name: companyProfile.company_name,
      value_proposition: companyProfile.value_proposition,
      key_differentiators: companyProfile.key_differentiators,
      products_services: companyProfile.products_services,
      target_verticals: companyProfile.target_verticals,
      competitors: companyProfile.competitors,
      competitive_positioning: companyProfile.competitive_positioning,
      buying_triggers: companyProfile.buying_triggers,
      sales_intelligence_context: companyProfile.sales_intelligence_context,
    } : undefined

    // Build target company info
    const targetCompany: TargetCompany = {
      company_name: tamAccount.company_name,
      website: tamAccount.website,
      industry: tamAccount.industry,
      vertical: tamAccount.vertical,
      employee_count: tamAccount.employee_count,
      headquarters: tamAccount.headquarters,
      company_summary: tamAccount.company_summary,
    }

    // Generate search queries based on campaign context
    const allQueries: string[] = []
    for (const campaign of campaignContexts) {
      const queries = generateCampaignSearchQueries(campaign, tamAccount.company_name, level)
      allQueries.push(...queries)
    }
    const uniqueQueries = [...new Set(allQueries)].slice(0, 8)

    // Perform web searches in parallel
    const searchPromises = uniqueQueries.map(async (query) => {
      const results = await performWebSearch(query)
      return { query, results }
    })
    const webSearchResults = await Promise.all(searchPromises)

    // Run campaign intelligence
    const intelligence = await runCampaignIntelligence({
      level,
      campaigns: campaignContexts,
      companyContext,
      targetCompany,
      webSearchResults,
    })

    // For tam_screening, update the TAM account with fit info
    if (level === 'tam_screening' && 'fit_score' in intelligence) {
      await supabase
        .from('tam_accounts')
        .update({
          priority_score: intelligence.fit_score,
          fit_rationale: intelligence.fit_rationale,
          updated_at: new Date().toISOString(),
        })
        .eq('tam_account_id', tam_account_id)

      // Store detected signals if any
      if (intelligence.detected_signals?.length) {
        // Could store in account_signals table if needed
      }
    }

    // For account_building, prepare data for saving
    if (level === 'account_building' && 'thesis' in intelligence) {
      // This data can be used to populate account fields
      // The caller can save it to tam_accounts or account_plans
    }

    return Response.json({
      success: true,
      level,
      intelligence,
      search_queries_used: uniqueQueries,
    })
  } catch (error) {
    console.error('TAM intelligence error:', error)
    return Response.json(
      { error: 'Failed to run intelligence analysis' },
      { status: 500 }
    )
  }
}
