import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, industry, researchFindings } = body

    // Build context from research findings
    let researchContext = ''
    if (researchFindings && researchFindings.length > 0) {
      const orgFindings = researchFindings.filter(
        (f: { category: string }) =>
          f.category === 'organization' ||
          f.category === 'structure' ||
          f.category === 'business'
      )
      if (orgFindings.length > 0) {
        researchContext = `\n\nResearch findings about their organization:\n${orgFindings.map((f: { finding: string }) => `- ${f.finding}`).join('\n')}`
      }
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are helping a sales rep map out the organizational structure of ${companyName}${industry ? ` (${industry} industry)` : ''}.${researchContext}

Based on this company and industry, suggest 4-6 key business units or divisions that likely exist. Focus on divisions relevant to selling B2B software/services.

Return ONLY a JSON array of business unit names, nothing else:
["Unit 1", "Unit 2", "Unit 3"]

Be specific to this company and industry if known, otherwise use typical divisions for the industry.`,
        },
      ],
    })

    // Parse the response
    const content = message.content[0]
    if (content.type !== 'text') {
      return Response.json({ units: [] })
    }

    try {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const units = JSON.parse(jsonMatch[0])
        return Response.json({ units })
      }
    } catch {
      console.error('Failed to parse AI response:', content.text)
    }

    return Response.json({ units: [] })
  } catch (error) {
    console.error('Org structure API error:', error)
    return Response.json({ error: 'Failed to analyze org structure' }, { status: 500 })
  }
}
