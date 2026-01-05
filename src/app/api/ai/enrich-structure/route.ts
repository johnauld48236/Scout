import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Web search for company structure
async function searchCompanyStructure(companyName: string): Promise<string> {
  try {
    const queries = [
      `${companyName} divisions business units`,
      `${companyName} products services portfolio`,
      `${companyName} company structure organization`,
    ]

    const results: string[] = []

    for (const query of queries) {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(8000),
        })

        if (!response.ok) continue

        const html = await response.text()

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
      } catch {
        continue
      }
    }

    return results.slice(0, 15).join('\n\n')
  } catch {
    return ''
  }
}

// POST /api/ai/enrich-structure - Enrich company structure, divisions, products
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { companyName, domain, industry } = body

    if (!companyName?.trim()) {
      return Response.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Search for structure information
    const searchResults = await searchCompanyStructure(companyName)

    const prompt = `You are researching the corporate structure of ${companyName}.

Company: ${companyName}
Website: ${domain || 'Unknown'}
Industry: ${industry || 'Unknown'}

Research Results:
${searchResults || '[No search results available]'}

Based on your knowledge and the research results, provide:
1. Corporate profile (headquarters, employee count, revenue, ownership type, CEO if known)
2. Major divisions, business units, or subsidiaries
3. Key products or services for each division

Respond with a JSON object in this exact format:
{
  "corporateStructure": {
    "headquarters": "City, Country",
    "parent_company": "Parent company name if subsidiary, or null",
    "ownership_type": "public" | "private" | "subsidiary",
    "stock_symbol": "TICKER or null",
    "employee_count": 50000,
    "annual_revenue": "$10B",
    "founded_year": 1900,
    "ceo": "Name of CEO"
  },
  "divisions": [
    {
      "name": "Division Name",
      "description": "What this division does",
      "division_type": "division" | "business_unit" | "subsidiary" | "region",
      "products": ["Product 1", "Product 2"],
      "headcount": 5000,
      "key_focus_areas": ["Area 1", "Area 2"]
    }
  ]
}

Important:
- Only include divisions you are confident exist
- Use null for unknown numeric values
- Be conservative - it's better to have fewer accurate divisions than many guesses
- For large companies, focus on major divisions (4-8 max)
- Only respond with valid JSON, no other text`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: 'You are a corporate research analyst. Extract structured information about company organization. Respond only with valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract text content
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    // Parse JSON response
    let result
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      // Fallback response
      result = {
        corporateStructure: null,
        divisions: [],
      }
    }

    // Add IDs to divisions
    if (result.divisions) {
      result.divisions = result.divisions.map((d: Record<string, unknown>, i: number) => ({
        ...d,
        id: `div-${Date.now()}-${i}`,
      }))
    }

    return Response.json(result)
  } catch (error) {
    console.error('Structure enrichment error:', error)
    return Response.json(
      { error: 'Failed to enrich structure' },
      { status: 500 }
    )
  }
}
