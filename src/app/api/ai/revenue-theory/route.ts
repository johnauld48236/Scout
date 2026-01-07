import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface AccountContext {
  companyName: string
  industry?: string
  vertical?: string
  website?: string
  employeeCount?: string | number
  headquarters?: string
  companyDescription?: string
  divisions?: Array<{ name: string; description?: string; products?: string[] }>
  stakeholders?: Array<{ name: string; title: string; department?: string; influence_level?: string }>
  signals?: Array<{ title: string; content: string; category?: string }>
  compellingEvents?: Array<{ event: string; impact?: string }>
  campaigns?: Array<{ name: string; painPoints?: string; valueProposition?: string }>
}

interface RevenueTheoryRequest {
  accountContext: AccountContext
  userMessage?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  stage: 'initial' | 'refine' | 'finalize'
}

const SYSTEM_PROMPT = `You are a sales coach helping a rep define their first Scout Theme (revenue opportunity hypothesis) for an account.

Your role is EDUCATIONAL and EXPLORATORY - you help the rep think through the opportunity, you don't prescribe what to sell.

A Scout Theme is:
- A hypothesis about why this account might buy
- Based on signals, stakeholder insights, and market context
- Sized as High/Medium/Low opportunity (NOT dollar values)
- Includes questions to investigate
- Connects to specific stakeholders

Your conversation should:
1. First: Summarize what you see in the account (signals, stakeholders, opportunities)
2. Then: Guide the rep to articulate THEIR theory about the opportunity
3. Finally: Help them define a clear Scout Theme with questions to explore

IMPORTANT: Ask clarifying questions. Don't assume. Help the rep think.

The output Scout Theme should include:
- Title: Clear, concise name for the opportunity hypothesis
- Description: What's the opportunity about?
- Why It Matters: Connected signals/events that make this relevant NOW
- Value Sizing: High/Medium/Low based on signal strength and company size
- Key Stakeholders: Who to engage
- Questions to Explore: What the rep needs to learn to validate this hypothesis`

export async function POST(request: NextRequest) {
  try {
    const body: RevenueTheoryRequest = await request.json()
    const { accountContext, userMessage, conversationHistory = [], stage } = body

    if (!accountContext.companyName) {
      return Response.json({ error: 'Account context required' }, { status: 400 })
    }

    // Build context summary
    const contextSummary = buildContextSummary(accountContext)

    // Build messages
    const messages: Anthropic.MessageParam[] = []

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      })
    }

    // Build current message based on stage
    let currentMessage: string

    if (stage === 'initial' && conversationHistory.length === 0) {
      currentMessage = `I'm helping a sales rep build their first Scout Theme for ${accountContext.companyName}.

Here's what we know about the account:

${contextSummary}

Please:
1. Summarize the key insights you see (signals, stakeholder landscape, potential opportunities)
2. Ask the rep what opportunity they're most interested in exploring
3. Be conversational and help them think through it

Remember: We're helping them define a hypothesis to investigate, not a deal to close.`
    } else if (stage === 'finalize') {
      currentMessage = userMessage || 'Based on our discussion, help me finalize the Scout Theme.'
      currentMessage += `

Now create the final Scout Theme. Return a JSON object at the end of your response:

\`\`\`json
{
  "theme": {
    "title": "Theme title",
    "description": "What this opportunity is about",
    "why_it_matters": "Why this is worth exploring now (connected signals)",
    "size": "high" | "medium" | "low",
    "key_stakeholders": ["Name - Title", "Name - Title"],
    "questions_to_explore": ["Question 1", "Question 2", "Question 3"]
  }
}
\`\`\``
    } else {
      currentMessage = userMessage || 'Continue helping me think through this opportunity.'
    }

    messages.push({
      role: 'user',
      content: currentMessage,
    })

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return Response.json({ error: 'No response' }, { status: 500 })
    }

    // Check if there's a finalized theme in the response
    let theme = null
    const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        theme = parsed.theme || parsed
      } catch {
        // JSON parsing failed, no theme yet
      }
    }

    return Response.json({
      message: content.text,
      theme,
      isComplete: !!theme,
    })
  } catch (error) {
    console.error('Revenue theory error:', error)
    return Response.json({ error: 'Failed to process' }, { status: 500 })
  }
}

function buildContextSummary(ctx: AccountContext): string {
  const parts: string[] = []

  parts.push(`**Company:** ${ctx.companyName}`)
  if (ctx.industry) parts.push(`**Industry:** ${ctx.industry}`)
  if (ctx.vertical) parts.push(`**Vertical:** ${ctx.vertical}`)
  if (ctx.employeeCount) parts.push(`**Size:** ${ctx.employeeCount} employees`)
  if (ctx.headquarters) parts.push(`**HQ:** ${ctx.headquarters}`)
  if (ctx.companyDescription) parts.push(`**About:** ${ctx.companyDescription}`)

  if (ctx.divisions && ctx.divisions.length > 0) {
    parts.push(`\n**Divisions:**`)
    for (const div of ctx.divisions) {
      parts.push(`- ${div.name}${div.description ? `: ${div.description}` : ''}`)
      if (div.products && div.products.length > 0) {
        parts.push(`  Products: ${div.products.join(', ')}`)
      }
    }
  }

  if (ctx.stakeholders && ctx.stakeholders.length > 0) {
    parts.push(`\n**Key Stakeholders:**`)
    for (const s of ctx.stakeholders) {
      parts.push(`- ${s.name} - ${s.title}${s.department ? ` (${s.department})` : ''}${s.influence_level ? ` [${s.influence_level} influence]` : ''}`)
    }
  }

  if (ctx.signals && ctx.signals.length > 0) {
    parts.push(`\n**Signals & Intelligence:**`)
    for (const sig of ctx.signals) {
      parts.push(`- ${sig.title}: ${sig.content}`)
    }
  }

  if (ctx.compellingEvents && ctx.compellingEvents.length > 0) {
    parts.push(`\n**Compelling Events:**`)
    for (const evt of ctx.compellingEvents) {
      parts.push(`- ${evt.event}${evt.impact ? ` (Impact: ${evt.impact})` : ''}`)
    }
  }

  if (ctx.campaigns && ctx.campaigns.length > 0) {
    parts.push(`\n**Relevant Campaigns:**`)
    for (const c of ctx.campaigns) {
      parts.push(`- ${c.name}`)
      if (c.painPoints) parts.push(`  Pain points: ${c.painPoints}`)
      if (c.valueProposition) parts.push(`  Value prop: ${c.valueProposition}`)
    }
  }

  return parts.join('\n')
}
