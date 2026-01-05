import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface Stakeholder {
  full_name: string
  title?: string
  department?: string
  role_type?: string
}

interface OrgGapRequest {
  companyName: string
  industry?: string
  employeeCount?: string
  stakeholders: Stakeholder[]
  pursuits?: { name: string; description?: string }[]
}

export async function POST(request: NextRequest) {
  try {
    const body: OrgGapRequest = await request.json()
    const { companyName, industry, employeeCount, stakeholders, pursuits = [] } = body

    if (!companyName) {
      return Response.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Build the stakeholder list for context
    const stakeholderList = stakeholders.length > 0
      ? stakeholders.map(s => `- ${s.full_name}${s.title ? ` (${s.title})` : ''}${s.department ? ` - ${s.department}` : ''}${s.role_type ? ` [${s.role_type}]` : ''}`).join('\n')
      : 'No stakeholders mapped yet'

    // Build pursuit context
    const pursuitContext = pursuits.length > 0
      ? `\n\nACTIVE OPPORTUNITIES:\n${pursuits.map(p => `- ${p.name}${p.description ? `: ${p.description}` : ''}`).join('\n')}`
      : ''

    const prompt = `Analyze the stakeholder coverage for selling to ${companyName}.

COMPANY CONTEXT:
- Company: ${companyName}
- Industry: ${industry || 'Unknown'}
- Size: ${employeeCount || 'Unknown'}
${pursuitContext}

CURRENT STAKEHOLDER MAP:
${stakeholderList}

Based on typical B2B enterprise sales, identify GAPS in the stakeholder map. Consider:

1. **Missing Decision Makers**: Who typically approves purchases of this type?
2. **Missing Influencers**: Technical evaluators, end users, procurement?
3. **Missing Champions**: Who could advocate internally for us?
4. **Missing Blockers to Identify**: Potential obstacles we should map?
5. **Departmental Gaps**: Given the pursuits, which departments should we cover?

For each gap, provide:
- A suggested title/role (be specific to the industry)
- Why this role matters for the deal
- What role_type they likely are (Economic Buyer, Technical Buyer, Champion, Influencer, Blocker, End User)
- Priority (High, Medium, Low)

Return as JSON array:
[
  {
    "suggested_title": "VP of IT Infrastructure",
    "department": "IT",
    "why_important": "Controls infrastructure budget and technical standards",
    "role_type": "Technical Buyer",
    "priority": "High"
  }
]

Only return the JSON array, no other text. Limit to 5-7 most critical gaps.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'You are a B2B sales strategy expert. Analyze stakeholder coverage and identify gaps in the org chart. Always return valid JSON.',
      messages: [{
        role: 'user',
        content: prompt
      }],
    })

    const content = response.content[0]
    const textContent = content.type === 'text' ? content.text : '[]'

    // Parse the JSON response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return Response.json({ gaps: [], message: 'No gaps identified' })
    }

    const gaps = JSON.parse(jsonMatch[0])

    return Response.json({
      success: true,
      gaps,
      stakeholderCount: stakeholders.length
    })
  } catch (error) {
    console.error('Org gaps API error:', error)
    return Response.json({ error: 'Failed to analyze org gaps' }, { status: 500 })
  }
}
