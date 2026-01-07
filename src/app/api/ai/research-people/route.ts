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
  divisions?: string[]
  campaignContext?: string
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, domain, industry, divisions, campaignContext }: PeopleResearchRequest = await request.json()

    if (!companyName) {
      return Response.json({ error: 'Company name required' }, { status: 400 })
    }

    // Build context for more targeted people discovery
    const divisionsContext = divisions && divisions.length > 0
      ? `Known divisions/business units: ${divisions.join(', ')}`
      : ''

    const campaignInfo = campaignContext
      ? `Sales context: ${campaignContext}`
      : ''

    // Use Claude's knowledge directly - more reliable than web scraping
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are a B2B sales research analyst with extensive knowledge of corporate leadership and organizational structures.

Your job is to identify key stakeholders at companies that a sales rep should engage with.

Focus on:
1. C-suite executives (CEO, CFO, CTO, CISO, CIO, COO)
2. VP and Director level leaders in relevant functions
3. Business unit/division presidents or GMs
4. Key decision makers for technology/security purchases
5. Recently promoted or hired executives

Be realistic about what roles exist at different company sizes.`,
      messages: [{
        role: 'user',
        content: `Identify key stakeholders at ${companyName}${industry ? ` (${industry} industry)` : ''}.

${divisionsContext}
${campaignInfo}

Based on your knowledge of this company and typical organizational structures, who are the key people a B2B sales rep should know about?

Return a JSON object:
{
  "people": [
    {
      "name": "Full Name (use actual names you know, or '[Title Holder]' if name unknown)",
      "title": "Their Title",
      "department": "Business Unit, Division, or Function",
      "influence_level": "high" | "medium" | "low",
      "relevance": "Why this person matters for a sales engagement",
      "known": true | false (true if you know the actual person's name)
    }
  ],
  "orgInsights": "Brief description of how the company is organized - key divisions, reporting structure, decision-making patterns. 2-3 sentences.",
  "keyRoles": ["List of 3-5 most important roles to engage based on the sales context"],
  "suggestedApproach": "Brief recommendation on how to approach this account's stakeholders. 1-2 sentences."
}

For well-known companies, include actual executive names you're confident about.
For less-known companies, focus on the roles that should exist and mark known: false.
Prioritize relevance for B2B technology/security sales.
Return only valid JSON.`
      }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '{}'

    // Parse JSON response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({
        people: [],
        orgInsights: '',
        keyRoles: [],
        suggestedApproach: '',
      })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return Response.json({
      people: parsed.people || [],
      orgInsights: parsed.orgInsights || '',
      keyRoles: parsed.keyRoles || [],
      suggestedApproach: parsed.suggestedApproach || '',
    })
  } catch (error) {
    console.error('People research error:', error)
    return Response.json({ error: 'Research failed' }, { status: 500 })
  }
}
