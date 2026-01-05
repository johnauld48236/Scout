import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface CompellingEvent {
  event: string
  date?: string
  impact?: 'high' | 'medium' | 'low'
}

interface BuyingSignal {
  signal: string
  type?: string
  strength?: 'strong' | 'moderate' | 'weak'
}

interface ResearchFinding {
  id?: string
  category: string
  content: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  estimated_value?: number
  stage?: string
}

interface ExistingContext {
  painPoints?: string[]
  risks?: string[]
  opportunities?: string[]
  bantGaps?: string[]
  accountThesis?: string
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  researchFindings?: ResearchFinding[]
  campaignName?: string
  campaignContext?: string
  vertical?: string
}

function buildContextSection(existingContext: ExistingContext, pursuits: Pursuit[]): string {
  const sections: string[] = []

  // Account Thesis
  if (existingContext.accountThesis) {
    sections.push(`**Account Thesis:**\n${existingContext.accountThesis}`)
  }

  // Campaign/Vertical
  if (existingContext.campaignName || existingContext.vertical) {
    sections.push(`**Campaign/Vertical:** ${existingContext.campaignName || existingContext.vertical}`)
  }

  // Active Opportunities
  if (pursuits.length > 0) {
    const oppList = pursuits.map(p => {
      const value = p.estimated_value ? ` ($${(p.estimated_value / 1000).toFixed(0)}K)` : ''
      const stage = p.stage ? ` - ${p.stage}` : ''
      return `- ${p.name}${value}${stage}`
    }).join('\n')
    sections.push(`**Active Opportunities (${pursuits.length}):**\n${oppList}`)
  }

  // Compelling Events - these are time-sensitive triggers
  if (existingContext.compellingEvents?.length) {
    const events = existingContext.compellingEvents.map(e => {
      const impact = e.impact ? ` [${e.impact} impact]` : ''
      const date = e.date ? ` (${e.date})` : ''
      return `- ${e.event}${date}${impact}`
    }).join('\n')
    sections.push(`**Compelling Events (use these to create urgency):**\n${events}`)
  }

  // Buying Signals - evidence of intent
  if (existingContext.buyingSignals?.length) {
    const signals = existingContext.buyingSignals.map(s => {
      const strength = s.strength ? ` [${s.strength}]` : ''
      return `- ${s.signal}${strength}`
    }).join('\n')
    sections.push(`**Buying Signals (evidence of intent):**\n${signals}`)
  }

  // BANT Gaps - qualification weaknesses to address
  if (existingContext.bantGaps?.length) {
    sections.push(`**BANT Qualification Gaps (must address these):**\n${existingContext.bantGaps.map(g => `- ${g}`).join('\n')}`)
  }

  // Pain Points
  if (existingContext.painPoints?.length) {
    sections.push(`**Known Pain Points:**\n${existingContext.painPoints.slice(0, 5).map(p => `- ${p}`).join('\n')}`)
  }

  // Risks
  if (existingContext.risks?.length) {
    sections.push(`**Open Risks:**\n${existingContext.risks.slice(0, 5).map(r => `- ${r}`).join('\n')}`)
  }

  // Research Findings
  if (existingContext.researchFindings?.length) {
    const findings = existingContext.researchFindings.slice(0, 5).map(f => `- [${f.category}] ${f.content}`).join('\n')
    sections.push(`**Research Findings:**\n${findings}`)
  }

  return sections.join('\n\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      accountName,
      messages,
      existingContext = {},
      pursuits = [],
      generateOpener = false,
    } = body as {
      accountName: string
      messages: Message[]
      existingContext: ExistingContext
      pursuits: Pursuit[]
      generateOpener?: boolean
    }

    const contextSection = buildContextSection(existingContext, pursuits)
    const hasRichContext = existingContext.compellingEvents?.length ||
      existingContext.buyingSignals?.length ||
      existingContext.bantGaps?.length ||
      existingContext.accountThesis

    const systemPrompt = `You are a sales planning assistant helping a sales rep build a 90-day execution plan for "${accountName}".

${contextSection ? `=== ACCOUNT INTELLIGENCE ===\n${contextSection}\n\n` : ''}=== YOUR ROLE ===
Your goal is to help the rep create a 30/60/90-day plan. Be ACTION-ORIENTED, not conversational. Get to the plan quickly.

${generateOpener ? `=== OPENING STATUS BRIEFING ===
This is your opening message. You MUST start with a STATUS BRIEFING that shows the rep what you see:

**Format your opening exactly like this:**

📊 **Account Status**
[Summarize in 2-3 bullet points what you see - # of open risks, # of opportunities, key signals, any overdue items or gaps]

⚠️ **Areas Needing Attention** (if any risks, gaps, or issues exist)
[List 1-3 specific issues that need to be fixed/addressed]

🚀 **Growth Opportunities** (if signals or opportunities exist)
[List 1-3 specific opportunities to pursue or expand]

Then ask: **"Would you like to focus on addressing issues or pursuing growth opportunities?"**

Be SPECIFIC about what you found in the data. Use actual numbers and names from the context.
If there are no risks/issues, skip that section. If there are no opportunities, say so.
Keep the entire opening under 200 words.` : `=== CONTINUE PLANNING ===
The user has given direction. Now move quickly toward generating the plan.

If they chose "fix/address issues":
- Focus milestones on resolving risks, closing gaps, completing overdue items
- Prioritize BANT gaps and open risks

If they chose "growth/opportunities":
- Focus milestones on advancing deals, engaging stakeholders, capitalizing on signals
- Prioritize compelling events and buying signals

After ONE exchange (or immediately if they give clear direction), propose milestones.
Don't ask too many clarifying questions. Be decisive and propose a plan.`}

=== MILESTONE GENERATION ===
When ready to propose milestones (which should be QUICKLY), output a JSON block:

\`\`\`json
{
  "ready": true,
  "milestones": [
    {"text": "Specific actionable milestone", "period": "day_30", "rationale": "Brief reason"},
    {"text": "Another milestone", "period": "day_60", "rationale": "Why this timing"}
  ]
}
\`\`\`

Milestone guidelines:
- **day_30**: Immediate actions - address urgent items, initial meetings, resolve blockers
- **day_60**: Build momentum - deeper engagement, validation, address gaps
- **day_90**: Close activities - proposals, decisions, finalizing

Make milestones:
- Specific and actionable (not "build relationship" but "Schedule demo with VP Engineering")
- Tied to actual data from the context (reference real opportunities, risks, gaps)
- Realistic for B2B enterprise sales

Generate 6-10 milestones total. BIAS TOWARD ACTION - propose a plan rather than asking more questions.`

    // Build messages
    const anthropicMessages: { role: 'user' | 'assistant'; content: string }[] = []

    if (generateOpener) {
      // For opener, we send a synthetic user message asking for analysis
      anthropicMessages.push({
        role: 'user',
        content: 'Please analyze this account and help me plan the next 90 days.',
      })
    } else {
      // Regular conversation flow
      for (const m of messages) {
        anthropicMessages.push({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const assistantContent = response.content[0]
    if (assistantContent.type !== 'text') {
      return Response.json({ message: 'I encountered an issue. Could you try again?' })
    }

    const text = assistantContent.text

    // Check if the response contains a JSON milestone block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        if (parsed.ready && parsed.milestones) {
          const messagePart = text.replace(/```json[\s\S]*```/, '').trim()
          return Response.json({
            message: messagePart || "I've created a 90-day plan based on our discussion. Review and adjust the milestones below.",
            milestones: parsed.milestones,
          })
        }
      } catch (e) {
        console.error('Failed to parse milestones JSON:', e)
      }
    }

    return Response.json({ message: text })
  } catch (error) {
    console.error('Planning wizard API error:', error)
    return Response.json(
      { error: 'Failed to process planning request' },
      { status: 500 }
    )
  }
}
