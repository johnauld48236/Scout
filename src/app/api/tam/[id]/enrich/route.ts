import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_REGIONS = ['North America', 'EU', 'APAC', 'Latin America', 'Middle East', 'Global'] as const
const VALID_REGULATIONS = ['FDA_524B', 'CRA', 'UN_R155', 'ISO_21434', 'MDR', 'NIS2', 'IEC_62443'] as const

interface EnrichmentResult {
  operating_regions: string[]
  products_overview: string
  regulatory_exposure: string[]
}

// POST /api/tam/[id]/enrich - Enrich a single TAM account with AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch TAM account
    const { data: tamAccount, error } = await supabase
      .from('tam_accounts')
      .select('*')
      .eq('tam_account_id', id)
      .single()

    if (error || !tamAccount) {
      return Response.json({ error: 'TAM account not found' }, { status: 404 })
    }

    // 2. Call AI for enrichment
    const enrichmentData = await getEnrichmentFromAI(tamAccount)

    // 3. Update TAM account
    const { data: updatedAccount, error: updateError } = await supabase
      .from('tam_accounts')
      .update({
        operating_regions: enrichmentData.operating_regions,
        products_overview: enrichmentData.products_overview,
        regulatory_exposure: enrichmentData.regulatory_exposure,
        enrichment_status: 'enriched',
        enriched_at: new Date().toISOString()
      })
      .eq('tam_account_id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return Response.json({
      success: true,
      account: updatedAccount,
      enrichment: enrichmentData
    })

  } catch (err) {
    const { id } = await params
    const supabase = await createClient()

    // Mark as failed
    await supabase
      .from('tam_accounts')
      .update({ enrichment_status: 'failed' })
      .eq('tam_account_id', id)

    console.error('TAM enrichment error:', err)
    return Response.json({
      error: err instanceof Error ? err.message : 'Enrichment failed'
    }, { status: 500 })
  }
}

async function getEnrichmentFromAI(tamAccount: Record<string, unknown>): Promise<EnrichmentResult> {
  const anthropic = new Anthropic()

  const prompt = `You are enriching a TAM (Target Account Model) account for a cybersecurity company that sells automotive and medical device security solutions.

Company to research:
- Name: ${tamAccount.company_name}
- Website: ${tamAccount.website || 'Not provided'}
- Vertical: ${tamAccount.vertical || 'Not provided'}
- Headquarters: ${tamAccount.headquarters || 'Not provided'}

Research this company and determine:

1. **Operating Regions** - Where do they sell products or operate?
   Return as JSON array from ONLY these values:
   ["North America", "EU", "APAC", "Latin America", "Middle East", "Global"]
   Use "Global" if they operate in 3+ regions.

2. **Products Overview** - What products/services do they offer?
   Return as 2-3 sentence summary focused on products relevant to cybersecurity.

3. **Regulatory Exposure** - Which cybersecurity regulations likely apply?
   Return as JSON array from ONLY these values:
   - "FDA_524B" - Medical devices sold in US
   - "CRA" - Products with digital elements sold in EU
   - "UN_R155" - Vehicles sold in regulated markets
   - "ISO_21434" - Automotive cybersecurity
   - "MDR" - Medical devices in EU
   - "NIS2" - Critical infrastructure in EU
   - "IEC_62443" - Industrial automation

Return ONLY valid JSON:
{
  "operating_regions": ["EU", "North America"],
  "products_overview": "Description here...",
  "regulatory_exposure": ["CRA", "UN_R155"]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // Parse JSON from response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const data = JSON.parse(jsonMatch[0])

  // Validate and filter to only valid values
  return {
    operating_regions: (data.operating_regions || []).filter((r: string) =>
      VALID_REGIONS.includes(r as typeof VALID_REGIONS[number])
    ),
    products_overview: data.products_overview || '',
    regulatory_exposure: (data.regulatory_exposure || []).filter((r: string) =>
      VALID_REGULATIONS.includes(r as typeof VALID_REGULATIONS[number])
    )
  }
}
