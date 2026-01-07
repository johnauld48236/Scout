import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ScoutTheme {
  title: string
  description: string
  why_it_matters: string
  size: 'high' | 'medium' | 'low'
  key_stakeholders: string[]
  questions_to_explore: string[]
}

interface Stakeholder {
  name: string
  title: string
  department?: string
  influence_level?: string
}

interface PlanBuilderRequest {
  companyName: string
  scoutTheme: ScoutTheme
  stakeholders: Stakeholder[]
  userMessage?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  stage: 'initial' | 'refine' | 'finalize'
}

interface ActionItem {
  description: string
  bucket: '30' | '60' | '90'
  priority: 'high' | 'medium' | 'low'
  type: 'research' | 'outreach' | 'meeting' | 'internal' | 'follow_up'
  stakeholder?: string
  linked_question?: string
}

const SYSTEM_PROMPT = `You are a sales coach helping a rep build a realistic 30/60/90 day action plan to pursue a Scout Theme (opportunity hypothesis).

The plan should be:
- REALISTIC for a B2B enterprise sales cycle
- Focused on LEARNING and VALIDATION (not closing)
- Connected to the questions they need to answer
- Tied to specific stakeholders when relevant

30 Days (Discovery):
- Research tasks to answer key questions
- Initial outreach to key stakeholders
- Internal prep and strategy

60 Days (Validation):
- Discovery calls and meetings
- Deeper stakeholder engagement
- Validate or invalidate the hypothesis

90 Days (Decision):
- Confirm opportunity or pivot
- Advance to proposal stage or document learnings
- Clear next steps

Be conversational. Help the rep think through realistic actions. Don't just list generic tasks.`

export async function POST(request: NextRequest) {
  try {
    const body: PlanBuilderRequest = await request.json()
    const { companyName, scoutTheme, stakeholders, userMessage, conversationHistory = [], stage } = body

    if (!companyName || !scoutTheme) {
      return Response.json({ error: 'Company and Scout Theme required' }, { status: 400 })
    }

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
      currentMessage = `We just defined a Scout Theme for ${companyName}. Now let's build an action plan.

**Scout Theme:** ${scoutTheme.title}
**Description:** ${scoutTheme.description}
**Why It Matters:** ${scoutTheme.why_it_matters}
**Size:** ${scoutTheme.size}

**Questions to Explore:**
${scoutTheme.questions_to_explore.map((q, i) => `${i + 1}. ${q}`).join('\n')}

**Key Stakeholders:**
${scoutTheme.key_stakeholders.join('\n')}

**Full Stakeholder List:**
${stakeholders.map(s => `- ${s.name} - ${s.title}${s.influence_level ? ` (${s.influence_level})` : ''}`).join('\n')}

Help me build a 30/60/90 day plan to pursue this theme. Start by asking what my current situation is - do I have any existing relationships? What's my timeline? Any known constraints?`
    } else if (stage === 'finalize') {
      currentMessage = userMessage || 'Based on our discussion, finalize my 30/60/90 plan.'
      currentMessage += `

Create the final action plan. Return a JSON object at the end of your response:

\`\`\`json
{
  "plan": {
    "day_30": [
      {
        "description": "Action description",
        "priority": "high" | "medium" | "low",
        "type": "research" | "outreach" | "meeting" | "internal" | "follow_up",
        "stakeholder": "Name if applicable",
        "linked_question": "Which question this helps answer"
      }
    ],
    "day_60": [...],
    "day_90": [...]
  },
  "success_criteria": "How we'll know if we should convert this to an active opportunity",
  "pivot_criteria": "Signs that we should abandon or significantly pivot this theme"
}
\`\`\``
    } else {
      currentMessage = userMessage || 'Continue helping me build this plan.'
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

    // Check if there's a finalized plan in the response
    let plan = null
    const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1])
        plan = parsed.plan || parsed

        // Normalize the plan structure
        if (plan.day_30 || plan.day_60 || plan.day_90) {
          const normalizedActions: ActionItem[] = []

          const processBucket = (items: ActionItem[] | undefined, bucket: '30' | '60' | '90') => {
            if (!items) return
            for (const item of items) {
              normalizedActions.push({
                ...item,
                bucket,
                priority: item.priority || 'medium',
                type: item.type || 'research',
              })
            }
          }

          processBucket(plan.day_30, '30')
          processBucket(plan.day_60, '60')
          processBucket(plan.day_90, '90')

          plan = {
            actions: normalizedActions,
            success_criteria: parsed.success_criteria,
            pivot_criteria: parsed.pivot_criteria,
          }
        }
      } catch {
        // JSON parsing failed, no plan yet
      }
    }

    return Response.json({
      message: content.text,
      plan,
      isComplete: !!plan,
    })
  } catch (error) {
    console.error('Plan builder error:', error)
    return Response.json({ error: 'Failed to process' }, { status: 500 })
  }
}
