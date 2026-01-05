import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

const client = new Anthropic()

interface ParsedEngagement {
  date: string
  title: string
  attendees_internal: string[]
  attendees_external: string[]
  summary: string
  duration?: string
}

interface ParsedStakeholder {
  name: string
  title?: string
  company: string
  context?: string
}

interface ParsedAction {
  title: string
  owner?: string
  due_date?: string
  context?: string
}

interface ParsedRisk {
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  context?: string
}

interface ParsedPainPoint {
  description: string
  stakeholder?: string
  context?: string
}

interface ParsedKeyTakeaway {
  text: string
  meeting_date?: string
}

interface ParseResult {
  engagements: ParsedEngagement[]
  stakeholders: ParsedStakeholder[]
  actions: ParsedAction[]
  risks: ParsedRisk[]
  pain_points: ParsedPainPoint[]
  key_takeaways: ParsedKeyTakeaway[]
}

export async function POST(request: Request) {
  try {
    const { content, account_name, existing_stakeholders } = await request.json()

    if (!content) {
      return Response.json({ error: 'No content provided' }, { status: 400 })
    }

    const systemPrompt = `You are an expert at extracting structured data from sales meeting notes and call transcripts.
Your job is to parse the provided document and extract actionable intelligence for a sales account management system.

The account being discussed is: ${account_name || 'Unknown'}

${existing_stakeholders?.length > 0 ? `Known stakeholders for this account: ${existing_stakeholders.join(', ')}` : ''}

Extract the following entities:

1. ENGAGEMENTS (meetings/calls):
   - Date (YYYY-MM-DD format)
   - Title/subject
   - Internal attendees (from the seller's company)
   - External attendees (from the customer)
   - Brief summary (2-3 sentences)
   - Duration if mentioned

2. STAKEHOLDERS (new people mentioned):
   - Full name
   - Title/role if mentioned
   - Company (customer or seller)
   - Context of how they were mentioned

3. ACTION ITEMS:
   - title: The action/task to be done
   - owner: Who is responsible (optional)
   - due_date: When it's due in YYYY-MM-DD format (optional)
   - context: Additional context (optional)

4. RISKS/ISSUES:
   - description: What the risk or issue is
   - severity: low, medium, high, or critical based on business impact
   - context: Additional context (optional)

5. PAIN POINTS (customer frustrations/challenges):
   - description: What the pain/frustration is
   - stakeholder: Who expressed it (optional)
   - context: Additional context (optional)

6. KEY TAKEAWAYS (strategic insights):
   - The insight or key point
   - Which meeting it came from

Return ONLY valid JSON in this exact format:
{
  "engagements": [...],
  "stakeholders": [...],
  "actions": [...],
  "risks": [...],
  "pain_points": [...],
  "key_takeaways": [...]
}

Important:
- Only include NEW stakeholders not in the existing list
- Parse dates into YYYY-MM-DD format
- Be concise in descriptions
- Only include items that are clearly mentioned, don't invent data
- For the seller's company, use "C2A Security" or similar based on context`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `Parse the following meeting notes and extract structured data:\n\n${content}`
        }
      ],
      system: systemPrompt,
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse the JSON response
    let parsed: ParseResult
    try {
      // Find JSON in the response (handle markdown code blocks)
      let jsonStr = textContent.text
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      parsed = JSON.parse(jsonStr.trim())
    } catch (e) {
      console.error('Failed to parse AI response:', textContent.text)
      return Response.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return Response.json(parsed)
  } catch (error) {
    console.error('Parse notes error:', error)
    return Response.json({ error: 'Failed to parse notes' }, { status: 500 })
  }
}
