import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface PeopleResearchRequest {
  companyName: string
  domain?: string
  industry?: string
}

// Simple web search using DuckDuckGo HTML
async function searchWeb(query: string): Promise<string> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    if (!response.ok) return ''

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
        .replace(/&#x27;/g, "'")
        .trim()
      if (snippet) results.push(snippet)
    }

    // Extract titles
    const titleRegex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g
    while ((match = titleRegex.exec(html)) !== null) {
      const title = match[2].replace(/<[^>]*>/g, '').trim()
      if (title) results.push(`Source: ${title}`)
    }

    return results.slice(0, 15).join('\n')
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, domain, industry }: PeopleResearchRequest = await request.json()

    if (!companyName) {
      return Response.json({ error: 'Company name required' }, { status: 400 })
    }

    // Run multiple searches in parallel
    const [
      leadershipResults,
      executiveResults,
      orgResults,
      newsResults
    ] = await Promise.all([
      searchWeb(`${companyName} leadership team executives CEO CFO CTO`),
      searchWeb(`${companyName} executive team management board directors`),
      searchWeb(`${companyName} organizational structure business units divisions who runs`),
      searchWeb(`${companyName} executive news new hire promotion 2024 2025`),
    ])

    const combinedResults = `
LEADERSHIP SEARCH:
${leadershipResults}

EXECUTIVE SEARCH:
${executiveResults}

ORGANIZATION STRUCTURE:
${orgResults}

RECENT NEWS ON KEY PEOPLE:
${newsResults}
`.trim()

    // Use Claude to extract structured people data
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a B2B sales research analyst. Extract key people and organizational insights from search results. Focus on:
1. Named individuals with their titles
2. Business unit/division leaders
3. Recent executive changes (new hires, promotions)
4. Organizational structure insights

Be factual - only include people you can actually identify from the search results.`,
      messages: [{
        role: 'user',
        content: `Analyze these search results for ${companyName}${industry ? ` (${industry} industry)` : ''} and extract key people information.

${combinedResults}

Return a JSON object with this structure:
{
  "people": [
    {
      "name": "Full Name",
      "title": "Their Title",
      "department": "Business Unit or Department if known",
      "notes": "Any relevant context (e.g., 'New hire as of 2024', 'Leads the security division')"
    }
  ],
  "orgStructure": "Brief description of how the company is organized (divisions, business units, etc.) - 2-3 sentences max",
  "newsHighlights": "Any notable recent news about key people (promotions, new hires, departures) - 2-3 sentences max"
}

Only include people you can actually identify with names. If you can't find specific people, return an empty people array but still include any org structure insights. Return only valid JSON.`
      }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '{}'

    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ people: [], orgStructure: '', newsHighlights: '' })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return Response.json({
      people: parsed.people || [],
      orgStructure: parsed.orgStructure || '',
      newsHighlights: parsed.newsHighlights || '',
    })
  } catch (error) {
    console.error('People research error:', error)
    return Response.json({ error: 'Research failed' }, { status: 500 })
  }
}
