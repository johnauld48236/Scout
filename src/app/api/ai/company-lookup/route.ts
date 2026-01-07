import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Verify a domain exists by checking if it responds
async function verifyDomain(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok || response.status === 301 || response.status === 302
  } catch {
    return false
  }
}

// Generate likely domain variations for a company name
function generateDomainGuesses(companyName: string): string[] {
  const clean = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  const words = clean.split(/\s+/)
  const guesses: string[] = []

  // Common patterns
  guesses.push(`${words.join('')}.com`)
  guesses.push(`${words[0]}.com`)
  if (words.length > 1) {
    guesses.push(`${words.slice(0, 2).join('')}.com`)
  }

  // Remove common suffixes for cleaner domains
  const withoutSuffixes = clean
    .replace(/\b(inc|corp|corporation|llc|ltd|co|company|group|holdings)\b/gi, '')
    .trim()
    .split(/\s+/)

  if (withoutSuffixes.length > 0 && withoutSuffixes[0] !== words[0]) {
    guesses.push(`${withoutSuffixes.join('')}.com`)
    guesses.push(`${withoutSuffixes[0]}.com`)
  }

  return [...new Set(guesses)]
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query) {
      return Response.json({ error: 'Search query is required' }, { status: 400 })
    }

    // Use Claude's knowledge directly - more reliable than web scraping
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are a company research assistant with extensive knowledge of businesses worldwide.
Your job is to identify companies and provide accurate information about them.
You have knowledge of most major companies including their official websites, headquarters, size, and industry.
Be accurate - if you're not certain about something, indicate that in your confidence level.`,
      messages: [{
        role: 'user',
        content: `Look up information about this company: "${query}"

Provide details about the most likely company match. Return a JSON object:
{
  "name": "Official Company Name (legal/formal name)",
  "website": "company.com (just the domain, no https://)",
  "industry": "Their primary industry/sector",
  "employeeCount": "Approximate employee count or range like '10,000-50,000'",
  "headquarters": "City, State/Country",
  "description": "One or two sentences about what they do",
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "Brief explanation of your confidence level"
}

IMPORTANT for website:
- Provide the actual corporate domain (e.g., "medtronic.com", "apple.com")
- Do NOT include "www." or "https://"
- If uncertain, make an educated guess based on company name

For well-known companies, you should have high confidence.
For lesser-known companies, indicate medium or low confidence.
Only return valid JSON, nothing else.`
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

    // If no website was provided, try to guess and verify
    if (!company.website && company.name) {
      const guesses = generateDomainGuesses(company.name)
      for (const guess of guesses) {
        const valid = await verifyDomain(guess)
        if (valid) {
          company.website = guess
          company.confidenceReason = (company.confidenceReason || '') + ' Website verified via domain check.'
          break
        }
      }
    }

    // Optionally verify the website if provided
    if (company.website) {
      const verified = await verifyDomain(company.website)
      if (!verified) {
        // Try common variations
        const variations = [
          company.website,
          `www.${company.website}`,
          company.website.replace('www.', ''),
        ]
        let found = false
        for (const v of variations) {
          if (await verifyDomain(v)) {
            company.website = v.replace('www.', '')
            found = true
            break
          }
        }
        if (!found && company.confidence === 'high') {
          company.confidence = 'medium'
          company.confidenceReason = (company.confidenceReason || '') + ' Note: Could not verify website.'
        }
      }
    }

    return Response.json({ company })
  } catch (error) {
    console.error('Company lookup error:', error)
    return Response.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
