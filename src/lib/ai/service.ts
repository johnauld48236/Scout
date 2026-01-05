import { buildAIContext, parseNavigationFromPath } from './context/builder'
import { generateChatResponse, generateSuggestions, streamChatResponse, synthesizeResearch, generateSearchQueries } from './providers/anthropic'
import type { NavigationContext, AIContext, ChatResponse, AISuggestion, ConversationMessage, ResearchCategory, ResearchResponse } from './context/types'

export type { NavigationContext, AIContext, ChatResponse, AISuggestion, ResearchCategory, ResearchResponse }

// Main AI service facade
export const AIService = {
  // Build context from navigation
  async buildContext(navigation: NavigationContext): Promise<AIContext> {
    return buildAIContext(navigation)
  },

  // Parse navigation from URL
  parseNavigation(pathname: string, searchParams?: URLSearchParams): NavigationContext {
    return parseNavigationFromPath(pathname, searchParams)
  },

  // Get chat response
  async chat(
    context: AIContext,
    message: string,
    history: ConversationMessage[] = []
  ): Promise<ChatResponse> {
    const formattedHistory = history.map(m => ({
      role: m.role,
      content: m.content
    }))
    return generateChatResponse(context, message, formattedHistory)
  },

  // Stream chat response
  streamChat(
    context: AIContext,
    message: string,
    history: ConversationMessage[] = []
  ): AsyncGenerator<string> {
    const formattedHistory = history.map(m => ({
      role: m.role,
      content: m.content
    }))
    return streamChatResponse(context, message, formattedHistory)
  },

  // Get suggestions for current context
  async getSuggestions(context: AIContext, limit: number = 3): Promise<AISuggestion[]> {
    return generateSuggestions(context, limit)
  },

  // Generate search queries for company research
  getResearchQueries(
    companyName: string,
    domain: string | undefined,
    categories: ResearchCategory[],
    customPrompts: string[] = []
  ): string[] {
    return generateSearchQueries(companyName, domain, categories, customPrompts)
  },

  // Synthesize research from web search results
  async synthesizeResearch(
    companyName: string,
    domain: string | undefined,
    categories: ResearchCategory[],
    customPrompts: string[],
    webSearchResults: Array<{ query: string; results: string }>
  ): Promise<ResearchResponse> {
    return synthesizeResearch(companyName, domain, categories, customPrompts, webSearchResults)
  },

  // Check if AI is available (API key configured)
  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }
}

export default AIService
