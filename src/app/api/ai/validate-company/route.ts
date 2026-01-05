import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-sonnet-4-20250514'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Simple web fetch for company info
async function fetchCompanyPage(url: string): Promise<string> {
  try {
    // Normalize URL
    let normalizedUrl = url.trim().toLowerCase()
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()

    // Extract text content (strip HTML)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000) // Limit content

    return textContent
  } catch {
    return ''
  }
}

// POST /api/ai/validate-company - Validate and extract company info from URL
export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { url, companyName } = body

    if (!url?.trim()) {
      return Response.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch page content
    const pageContent = await fetchCompanyPage(url)

    const prompt = `You are validating a company website and extracting key information.

URL: ${url}
${companyName ? `Expected Company Name: ${companyName}` : ''}

Page Content (truncated):
${pageContent || '[Could not fetch page content]'}

Based on the URL and any available content, extract the following information about this company.
If the page content is empty, make reasonable inferences from the URL/domain.

Respond with a JSON object:
{
  "isValid": true/false,
  "companyName": "Official company name",
  "description": "Brief 1-2 sentence description of what the company does",
  "headquarters": "City, Country (if determinable)",
  "industry": "Primary industry/vertical",
  "employeeCount": "Approximate size (e.g., '10,000+', '500-1000')",
  "confidence": "high/medium/low"
}

If you cannot determine information, omit that field or use null.
Only respond with the JSON object, no other text.`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: 'You are a company validation assistant. Extract structured company information from websites. Respond only with valid JSON.',
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
        isValid: true,
        companyName: companyName || url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('.')[0],
        confidence: 'low',
      }
    }

    return Response.json(result)
  } catch (error) {
    console.error('Company validation error:', error)
    return Response.json(
      { error: 'Failed to validate company' },
      { status: 500 }
    )
  }
}
