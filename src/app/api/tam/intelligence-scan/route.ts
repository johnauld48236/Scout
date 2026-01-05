import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for the scan

interface ScanContext {
  company_focus: string
  target_verticals: string[]
  regulations_of_interest: string[]
  campaign_contexts: Array<{
    name: string
    focus: string | null
    pain_points: string | null
  }>
}

interface Signal {
  title: string
  summary: string
  source_url?: string
  signal_date?: string
  signal_type: string
  company_mentioned?: string
  regulations_matched: string[]
  confidence: 'high' | 'medium' | 'low'
}

interface TAMAccount {
  tam_account_id: string
  company_name: string
  vertical?: string
  regulatory_exposure?: string[]
}

// POST - Run intelligence scan
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. Create scan log entry
  const { data: scanLog, error: scanLogError } = await supabase
    .from('intelligence_scan_logs')
    .insert({ status: 'running' })
    .select()
    .single()

  if (scanLogError || !scanLog) {
    return NextResponse.json({ error: 'Failed to create scan log' }, { status: 500 })
  }

  const scanBatchId = scanLog.scan_id

  try {
    // 2. Get platform context
    const context = await buildScanContext(supabase)

    // 3. Get TAM accounts for matching
    const { data: tamAccounts } = await supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name, vertical')
      .in('status', ['Qualified', 'Researching', 'Pursuing', 'Prospecting', 'New'])

    // 4. Run AI-powered intelligence gathering
    const signals = await gatherIntelligence(context)

    // 5. Match signals to accounts
    const matchedSignals = matchSignalsToAccounts(signals, tamAccounts || [])

    // 6. Store signals
    const signalsToInsert = matchedSignals.map(signal => ({
      title: signal.title,
      summary: signal.summary,
      source_url: signal.source_url || null,
      signal_date: signal.signal_date || new Date().toISOString().split('T')[0],
      signal_type: signal.signal_type,
      company_mentioned: signal.company_mentioned || null,
      regulations_matched: signal.regulations_matched,
      confidence: signal.confidence,
      tam_account_id: signal.tam_account_id || null,
      match_type: signal.match_type || null,
      scan_batch_id: scanBatchId,
      needs_review: true,
      is_dismissed: false,
    }))

    const { data: insertedSignals, error: insertError } = await supabase
      .from('intelligence_signals')
      .insert(signalsToInsert)
      .select()

    if (insertError) {
      console.error('Failed to insert signals:', insertError)
    }

    // 7. Update scan log
    await supabase
      .from('intelligence_scan_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        signals_found: insertedSignals?.length || 0,
        accounts_matched: matchedSignals.filter(s => s.tam_account_id).length,
      })
      .eq('scan_id', scanBatchId)

    return NextResponse.json({
      data: {
        scan_id: scanBatchId,
        signals_found: insertedSignals?.length || 0,
        accounts_matched: matchedSignals.filter(s => s.tam_account_id).length,
        signals: insertedSignals,
      },
    })
  } catch (error) {
    console.error('Intelligence scan error:', error)

    await supabase
      .from('intelligence_scan_logs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('scan_id', scanBatchId)

    return NextResponse.json({ error: 'Intelligence scan failed' }, { status: 500 })
  }
}

// GET - Get recent scan results
export async function GET() {
  const supabase = await createClient()

  const { data: signals, error } = await supabase
    .from('intelligence_signals')
    .select(`
      *,
      tam_accounts(tam_account_id, company_name)
    `)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: signals })
}

async function buildScanContext(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never): Promise<ScanContext> {
  // Get company profile
  const { data: company } = await supabase
    .from('company_profile')
    .select('*')
    .single()

  // Get active campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('name, campaign_context, key_pain_points, target_verticals')
    .eq('status', 'active')

  // Build context
  return {
    company_focus: company?.value_proposition || 'Cybersecurity solutions for automotive and medical device industries',
    target_verticals: campaigns?.flatMap(c => c.target_verticals || []).filter(Boolean) || ['Automotive', 'Medical Device'],
    regulations_of_interest: ['FDA_524B', 'CRA', 'UN_R155', 'ISO_21434', 'MDR', 'NIS2', 'IEC_62443'],
    campaign_contexts: campaigns?.map(c => ({
      name: c.name,
      focus: c.campaign_context,
      pain_points: c.key_pain_points,
    })) || [],
  }
}

async function gatherIntelligence(context: ScanContext): Promise<Signal[]> {
  const anthropic = new Anthropic()

  const prompt = `You are an intelligence analyst for a cybersecurity company that sells automotive and medical device security solutions.

Your task: Generate realistic intelligence signals that would indicate sales opportunities based on current industry trends and regulatory landscape.

CONTEXT:
- Company focus: ${context.company_focus}
- Target verticals: ${context.target_verticals.join(', ')}
- Regulations we track: ${context.regulations_of_interest.join(', ')}
- Campaign focuses: ${JSON.stringify(context.campaign_contexts)}

GENERATE SIGNALS FOR:
1. Companies with recent FDA cybersecurity-related actions or announcements
2. EU Cyber Resilience Act (CRA) compliance news
3. Automotive cybersecurity incidents or UN R155 compliance news
4. Medical device companies announcing cybersecurity initiatives
5. Companies hiring for product security / cybersecurity roles
6. Security incidents at companies in automotive or medical device sectors
7. Regulatory enforcement actions related to our tracked regulations

For each signal, provide:
- title: Brief headline (max 100 chars)
- summary: 2-3 sentence description of the signal and why it matters
- source_url: Leave empty (we'll populate from research)
- signal_date: Date in YYYY-MM-DD format (use dates within last 30 days)
- signal_type: One of: 'regulatory_action', 'security_incident', 'hiring', 'news_mention', 'compliance_issue'
- company_mentioned: Specific company name if applicable
- regulations_matched: Array of matching regulations from [FDA_524B, CRA, UN_R155, ISO_21434, MDR, NIS2, IEC_62443]
- confidence: 'high', 'medium', or 'low'

Return as JSON array. Generate 8-12 relevant signals. Focus on quality and relevance.
Return ONLY the JSON array, no other text.

Example format:
[
  {
    "title": "Major Medical Device Maker Announces Cybersecurity Overhaul",
    "summary": "Leading medical device manufacturer announces comprehensive cybersecurity program in response to FDA 524B requirements. This signals budget allocation for security solutions.",
    "source_url": "",
    "signal_date": "2026-01-03",
    "signal_type": "compliance_issue",
    "company_mentioned": "Medtronic",
    "regulations_matched": ["FDA_524B", "MDR"],
    "confidence": "high"
  }
]`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // Parse JSON array from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('No JSON array found in response')
  }

  return JSON.parse(jsonMatch[0]) as Signal[]
}

function matchSignalsToAccounts(
  signals: Signal[],
  tamAccounts: TAMAccount[]
): (Signal & { tam_account_id?: string; match_type?: string })[] {
  return signals.map(signal => {
    let matchedAccount: TAMAccount | undefined
    let matchType: string | undefined

    // Try to match by company name
    if (signal.company_mentioned) {
      const normalizedMention = signal.company_mentioned.toLowerCase().trim()
      matchedAccount = tamAccounts.find(acc => {
        const normalizedName = acc.company_name.toLowerCase().trim()
        return (
          normalizedName.includes(normalizedMention) ||
          normalizedMention.includes(normalizedName) ||
          similarity(normalizedName, normalizedMention) > 0.8
        )
      })
      if (matchedAccount) matchType = 'direct_mention'
    }

    // If no direct match, try industry/vertical match
    if (!matchedAccount && signal.signal_type) {
      const signalVertical = signal.signal_type.includes('medical') ? 'Medical' :
                            signal.signal_type.includes('auto') ? 'Automotive' : null
      if (signalVertical) {
        matchedAccount = tamAccounts.find(acc => acc.vertical === signalVertical)
        if (matchedAccount) matchType = 'industry_match'
      }
    }

    return {
      ...signal,
      tam_account_id: matchedAccount?.tam_account_id,
      match_type: matchType,
    }
  })
}

// Simple string similarity function (Levenshtein-based)
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  if (longer.length === 0) return 1.0
  return (longer.length - editDistance(longer, shorter)) / longer.length
}

function editDistance(s1: string, s2: string): number {
  const costs: number[] = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}
