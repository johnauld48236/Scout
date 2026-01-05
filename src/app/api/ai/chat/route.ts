import { NextRequest } from 'next/server'
import AIService from '@/lib/ai/service'
import type { NavigationContext, ConversationMessage } from '@/lib/ai/context/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequestBody {
  message: string
  navigation?: NavigationContext
  context?: { navigation?: NavigationContext }
  conversationHistory?: ConversationMessage[]
  stream?: boolean
}

// POST /api/ai/chat - Send a chat message
export async function POST(request: NextRequest) {
  try {
    // Check if AI is available
    if (!AIService.isAvailable()) {
      return Response.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: ChatRequestBody = await request.json()
    const { message, conversationHistory = [], stream = false } = body

    // Support both `navigation` at top level and nested under `context`
    const navigation = body.navigation || body.context?.navigation || { page: 'other' as const }

    if (!message?.trim()) {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build enriched context
    const context = await AIService.buildContext(navigation)

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const generator = AIService.streamChat(context, message, conversationHistory)

            for await (const chunk of generator) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
            controller.close()
          }
        }
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    } else {
      // Non-streaming response
      const response = await AIService.chat(context, message, conversationHistory)

      return Response.json({
        success: true,
        ...response
      })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
