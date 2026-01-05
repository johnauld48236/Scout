import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Search the web for company information
async function searchCompany(query: string): Promise<string> {
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

    // Extract snippets and URLs
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

    // Extract URLs to find the company website
    const urlRegex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g
    while ((match = urlRegex.exec(html)) !== null) {
      const url = match[1]
      const title = match[2].replace(/<[^>]*>/g, '').trim()
      if (url && title && !url.includes('duckduckgo.com')) {
        results.push(`URL: ${url} - ${title}`)
      }
    }

    return results.slice(0, 15).join('\n')
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Search for the company
    const [companySearch, websiteSearch] = await Promise.all([
      searchCompany(`${query} company overview headquarters employees`),
      searchCompany(`${query} official website`),
    ])

    const searchResults = `
COMPANY SEARCH:
${companySearch}

WEBSITE SEARCH:
${websiteSearch}
`.trim()

    // Use Claude to extract company info from search results
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a company research assistant. Your job is to identify the correct company from search results and extract key information. Be accurate - if you're not sure about something, say so.`,
      messages: [{
        role: 'user',
        content: `The user searched for: "${query}"

Search results:
${searchResults}

Identify the most likely company match and extract information. Return a JSON object:
{
  "name": "Official Company Name",
  "website": "company.com (just the domain, no https://)",
  "industry": "Their primary industry",
  "employeeCount": "Employee range like '10,000-50,000' or 'Enterprise' if very large",
  "headquarters": "City, State/Country",
  "description": "One sentence about what they do",
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "Brief explanation of why you're confident or not"
}

If you find multiple possible matches, pick the most likely one (usually the largest/most well-known company with that name). Only return valid JSON.`
      }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '{}'

    // Parse the JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ company: null })
    }

    const company = JSON.parse(jsonMatch[0])

    return Response.json({ company })
  } catch (error) {
    console.error('Company lookup error:', error)
    return Response.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
