import { NextRequest } from 'next/server'
import AIService from '@/lib/ai/service'
import type { ResearchCategory } from '@/lib/ai/context/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ResearchRequestBody {
  companyName: string
  domain?: string
  categories: ResearchCategory[]
  customPrompts?: string[]
}

// Simple web search using DuckDuckGo HTML (no API key required)
async function performWebSearch(query: string): Promise<string> {
  try {
    // Use DuckDuckGo HTML interface as a fallback that doesn't require API keys
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!response.ok) {
      return `No results found for: ${query}`
    }

    const html = await response.text()

    // Extract search result snippets from DuckDuckGo HTML
    const results: string[] = []

    // Simple regex to extract result snippets
    const snippetRegex = /<a class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g
    let snippetMatch
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      const snippet = snippetMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim()
      if (snippet) {
        results.push(snippet)
      }
    }

    // Also extract titles and URLs
    const titleRegex = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/g
    let titleMatch
    while ((titleMatch = titleRegex.exec(html)) !== null) {
      const url = titleMatch[1]
      const title = titleMatch[2].replace(/<[^>]*>/g, '').trim()
      if (title && url && !url.includes('duckduckgo.com')) {
        results.push(`Source: ${title}`)
      }
    }

    if (results.length === 0) {
      return `No detailed results found for: ${query}`
    }

    return results.slice(0, 10).join('\n\n')
  } catch (error) {
    console.error('Web search error:', error)
    return `Search failed for: ${query}`
  }
}

// Check if a string looks like a valid domain
function isValidDomain(domain: string): boolean {
  // Must contain at least one dot and a TLD
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/
  return domainRegex.test(domain)
}

// Fetch company website content
async function fetchCompanyWebsite(domain: string): Promise<string> {
  try {
    // Skip if domain doesn't look valid
    if (!isValidDomain(domain)) {
      console.log('Skipping invalid domain:', domain)
      return ''
    }

    const url = domain.startsWith('http') ? domain : `https://${domain}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return ''
    }

    const html = await response.text()

    // Extract text content, removing scripts and styles
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000) // Limit content size

    return `Company website content:\n${textContent}`
  } catch (error) {
    console.error('Website fetch error:', error)
    return ''
  }
}

// POST /api/ai/research - Research a company
export async function POST(request: NextRequest) {
  try {
    // Check if AI is available
    if (!AIService.isAvailable()) {
      return Response.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: ResearchRequestBody = await request.json()
    const { companyName, domain, categories, customPrompts = [] } = body

    if (!companyName?.trim()) {
      return Response.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Generate search queries
    const queries = AIService.getResearchQueries(companyName, domain, categories, customPrompts)

    // Perform web searches in parallel (limit concurrency to avoid rate limiting)
    const searchPromises = queries.slice(0, 8).map(async (query) => {
      const results = await performWebSearch(query)
      return { query, results }
    })

    const webSearchResults = await Promise.all(searchPromises)

    // Optionally fetch company website
    if (domain) {
      const websiteContent = await fetchCompanyWebsite(domain)
      if (websiteContent) {
        webSearchResults.push({
          query: `Company website: ${domain}`,
          results: websiteContent
        })
      }
    }

    // Synthesize research using AI
    const research = await AIService.synthesizeResearch(
      companyName,
      domain,
      categories,
      customPrompts,
      webSearchResults
    )

    return Response.json({
      success: true,
      research
    })
  } catch (error) {
    console.error('Research API error:', error)
    return Response.json(
      { error: 'Failed to complete research' },
      { status: 500 }
    )
  }
}
