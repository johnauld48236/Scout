import { NextRequest } from 'next/server'
import AIService from '@/lib/ai/service'
import type { NavigationContext } from '@/lib/ai/context/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SuggestionsRequestBody {
  navigation: NavigationContext
  limit?: number
}

// POST /api/ai/suggestions - Get contextual suggestions
export async function POST(request: NextRequest) {
  try {
    // Check if AI is available
    if (!AIService.isAvailable()) {
      return Response.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    const body: SuggestionsRequestBody = await request.json()
    const { navigation, limit = 3 } = body

    if (!navigation?.page) {
      return Response.json(
        { error: 'Navigation context is required' },
        { status: 400 }
      )
    }

    // Build enriched context
    const context = await AIService.buildContext(navigation)

    // Generate suggestions
    const suggestions = await AIService.getSuggestions(context, limit)

    return Response.json({
      success: true,
      suggestions,
      metadata: {
        generatedAt: new Date().toISOString(),
        contextHash: `${navigation.page}-${navigation.entityId || 'none'}`
      }
    })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return Response.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}
