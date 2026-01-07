'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Signal {
  signal_id: string
  summary: string
  signal_type?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Division {
  division_id: string
  name: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  references?: {
    type: 'signal' | 'stakeholder' | 'division'
    id: string
    name: string
  }[]
}

interface Theme {
  id: string
  title: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  relatedSignals: string[]
  relatedStakeholders: string[]
}

interface ExploreOpportunitiesProps {
  accountId: string
  accountName: string
  signals: Signal[]
  stakeholders: Stakeholder[]
  divisions: Division[]
  industry?: string
  website?: string
}

export function ExploreOpportunities({
  accountId,
  accountName,
  signals,
  stakeholders,
  divisions,
  industry,
  website,
}: ExploreOpportunitiesProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [discoveredThemes, setDiscoveredThemes] = useState<Theme[]>([])
  const [showThemes, setShowThemes] = useState(false)

  // Suggested prompts based on available data
  const suggestedPrompts = [
    signals.length > 0 ? 'What patterns do you see in the recent signals?' : null,
    stakeholders.length > 0 ? `Who should I prioritize engaging with at ${accountName}?` : null,
    divisions.length > 0 ? 'Which business units have the strongest fit for our solutions?' : null,
    'What opportunities might we be missing?',
    'What are the biggest pain points this company likely faces?',
    industry ? `What trends in ${industry} could create urgency?` : null,
  ].filter(Boolean) as string[]

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with context message
  useEffect(() => {
    if (messages.length === 0) {
      const contextParts = []
      if (signals.length > 0) contextParts.push(`${signals.length} intelligence signals`)
      if (stakeholders.length > 0) contextParts.push(`${stakeholders.length} stakeholders`)
      if (divisions.length > 0) contextParts.push(`${divisions.length} business units`)

      const contextMessage: Message = {
        id: 'init',
        role: 'assistant',
        content: `I'm ready to help you explore opportunities at ${accountName}. ${
          contextParts.length > 0
            ? `I have access to ${contextParts.join(', ')} to inform our analysis.`
            : `We'll start by analyzing what we know about this company.`
        }\n\nWhat would you like to explore?`,
        timestamp: new Date(),
      }
      setMessages([contextMessage])
    }
  }, [accountName, signals.length, stakeholders.length, divisions.length])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/explore-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          accountName,
          industry,
          website,
          signals: signals.slice(0, 10), // Limit for context
          stakeholders: stakeholders.slice(0, 10),
          divisions,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          userQuery: input.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
        references: data.references,
      }

      setMessages(prev => [...prev, assistantMessage])

      // If themes were discovered, add them
      if (data.themes && data.themes.length > 0) {
        setDiscoveredThemes(prev => {
          const newThemes = data.themes.filter(
            (t: Theme) => !prev.some(existing => existing.title === t.title)
          )
          return [...prev, ...newThemes]
        })
        setShowThemes(true)
      }
    } catch (error) {
      console.error('Explore error:', error)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error while analyzing. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptClick = (prompt: string) => {
    setInput(prompt)
  }

  const handleCreatePursuit = async (theme: Theme) => {
    try {
      const response = await fetch('/api/pursuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountId,
          name: theme.title,
          thesis: theme.description,
          stage: 'Discovery',
        }),
      })

      if (response.ok) {
        setDiscoveredThemes(prev => prev.filter(t => t.id !== theme.id))
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to create pursuit:', error)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
                  Explore Opportunities
                </h1>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{accountName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScoutAIIcon size={20} className="text-scout-saddle" />
              <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>AI Analysis</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="col-span-2 space-y-4">
            {/* Messages */}
            <div
              className="rounded-xl border p-4 space-y-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)', minHeight: '400px', maxHeight: '600px', overflowY: 'auto' }}
            >
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-4 ${
                      message.role === 'user' ? '' : ''
                    }`}
                    style={{
                      backgroundColor: message.role === 'user' ? 'var(--scout-saddle)' : 'var(--scout-parchment)',
                      color: message.role === 'user' ? 'white' : 'var(--scout-earth)',
                    }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.references && message.references.length > 0 && (
                      <div className="mt-2 pt-2 border-t flex flex-wrap gap-1" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                        {message.references.map((ref, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: ref.type === 'signal' ? 'rgba(56, 152, 199, 0.2)' :
                                ref.type === 'stakeholder' ? 'rgba(93, 122, 93, 0.2)' :
                                'rgba(210, 105, 30, 0.2)',
                              color: 'var(--scout-earth)',
                            }}
                          >
                            {ref.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--scout-saddle)' }}>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about opportunities, patterns, or strategy..."
                className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-5 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Context Sidebar */}
          <div className="space-y-4">
            {/* Discovered Themes */}
            {discoveredThemes.length > 0 && (
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-trail)' }}
              >
                <h3 className="font-semibold mb-3" style={{ color: 'var(--scout-saddle)' }}>
                  Discovered Themes
                </h3>
                <div className="space-y-3">
                  {discoveredThemes.map(theme => (
                    <div
                      key={theme.id}
                      className="p-3 rounded-lg border"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                          {theme.title}
                        </p>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: theme.confidence === 'high' ? 'rgba(93, 122, 93, 0.15)' :
                              theme.confidence === 'medium' ? 'rgba(210, 105, 30, 0.15)' :
                              'var(--scout-parchment)',
                            color: theme.confidence === 'high' ? 'var(--scout-trail)' :
                              theme.confidence === 'medium' ? 'var(--scout-sunset)' :
                              'var(--scout-earth-light)',
                          }}
                        >
                          {theme.confidence}
                        </span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'var(--scout-earth)' }}>
                        {theme.description}
                      </p>
                      <button
                        onClick={() => handleCreatePursuit(theme)}
                        className="w-full text-xs py-1.5 rounded border transition-colors hover:bg-gray-50"
                        style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                      >
                        Create Pursuit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Signals */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--scout-saddle)' }}>
                Intelligence ({signals.length})
              </h3>
              {signals.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {signals.slice(0, 5).map(signal => (
                    <div
                      key={signal.signal_id}
                      className="text-xs p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                    >
                      {signal.summary.slice(0, 80)}...
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  No signals yet. Gather intelligence first.
                </p>
              )}
            </div>

            {/* Key Stakeholders */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <h3 className="font-semibold mb-3" style={{ color: 'var(--scout-saddle)' }}>
                Stakeholders ({stakeholders.length})
              </h3>
              {stakeholders.length > 0 ? (
                <div className="space-y-2">
                  {stakeholders.slice(0, 5).map(s => (
                    <div key={s.stakeholder_id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>{s.full_name}</p>
                        {s.title && <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{s.title}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  No stakeholders mapped yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
