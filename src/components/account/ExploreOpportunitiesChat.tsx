'use client'

import { useState, useRef, useEffect } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Signal {
  signal_id: string
  summary: string
  title?: string
  signal_type?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface ThemeSuggestion {
  title: string
  description: string
  why_it_matters: string
  questions: string[]
  suggested_size: 'high' | 'medium' | 'low'
  connected_signals: string[]
}

interface RelevantStakeholder {
  name: string
  title: string
  relevance: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  signals_summary?: string[]
  relevant_stakeholders?: RelevantStakeholder[]
  themes?: ThemeSuggestion[]
}

// Quick question suggestions to reduce typing
const QUICK_QUESTIONS = [
  'Tell me more about the first theme',
  'What competitors might be involved?',
  'Who should I talk to first?',
  'What questions should I ask in discovery?',
  'Are there any timing considerations?',
]

interface ExploreOpportunitiesChatProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  accountName: string
  signals: Signal[]
  stakeholders: Stakeholder[]
  industry?: string
  onThemeSaved: (theme: { theme_id: string; title: string; description?: string; why_it_matters?: string; size: 'high' | 'medium' | 'low'; questions_to_explore?: string[]; status: string }) => void
}

function getSizeDisplay(size: 'high' | 'medium' | 'low'): { label: string; color: string; bg: string } {
  switch (size) {
    case 'high':
      return { label: '$$$', color: 'var(--scout-trail)', bg: 'rgba(93, 122, 93, 0.15)' }
    case 'medium':
      return { label: '$$', color: 'var(--scout-sunset)', bg: 'rgba(210, 105, 30, 0.15)' }
    case 'low':
      return { label: '$', color: 'var(--scout-earth-light)', bg: 'var(--scout-parchment)' }
  }
}

export function ExploreOpportunitiesChat({
  isOpen,
  onClose,
  accountPlanId,
  accountName,
  signals,
  stakeholders,
  industry,
  onThemeSaved,
}: ExploreOpportunitiesChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [savingTheme, setSavingTheme] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'exploring' | 'finalizing'>('exploring')
  const [isGeneratingMore, setIsGeneratingMore] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initial exploration when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleInitialExploration()
    }
  }, [isOpen])

  const handleInitialExploration = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/explore-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
        }),
      })

      if (!response.ok) throw new Error('Failed to explore')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.follow_up_response || '',
        signals_summary: data.signals_summary || [],
        relevant_stakeholders: data.relevant_stakeholders || [],
        themes: data.themes || [],
      }

      setMessages([assistantMessage])
    } catch (error) {
      console.error('Exploration error:', error)
      setMessages([{
        id: 'error',
        role: 'assistant',
        content: 'I encountered an issue analyzing this account. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/explore-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          user_message: input.trim(),
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content || JSON.stringify({
              signals_summary: m.signals_summary,
              themes: m.themes,
            }),
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.follow_up_response || '',
        signals_summary: data.signals_summary,
        relevant_stakeholders: data.relevant_stakeholders,
        themes: data.themes,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTheme = async (theme: ThemeSuggestion) => {
    setSavingTheme(theme.title)
    try {
      const response = await fetch('/api/scout-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: theme.title,
          description: theme.description,
          why_it_matters: theme.why_it_matters,
          size: theme.suggested_size,
          questions_to_explore: theme.questions,
          signals_connected: theme.connected_signals,
        }),
      })

      if (response.ok) {
        const savedTheme = await response.json()
        onThemeSaved(savedTheme)
        // Mark theme as saved in messages
        setMessages(prev => prev.map(msg => {
          if (msg.themes) {
            return {
              ...msg,
              themes: msg.themes.filter(t => t.title !== theme.title),
            }
          }
          return msg
        }))
      }
    } catch (error) {
      console.error('Failed to save theme:', error)
    } finally {
      setSavingTheme(null)
    }
  }

  const handleReset = () => {
    setMessages([])
    setSelectedThemes(new Set())
    setMode('exploring')
    handleInitialExploration()
  }

  // Toggle theme selection
  const toggleThemeSelection = (themeTitle: string) => {
    setSelectedThemes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(themeTitle)) {
        newSet.delete(themeTitle)
      } else {
        newSet.add(themeTitle)
      }
      return newSet
    })
  }

  // Generate more ideas
  const handleGenerateMore = async () => {
    setIsGeneratingMore(true)
    try {
      // Get existing theme titles to ask for different ones
      const existingThemes = messages
        .flatMap(m => m.themes || [])
        .map(t => t.title)

      const response = await fetch('/api/ai/explore-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          user_message: `Generate different trail ideas. Avoid these themes I already have: ${existingThemes.join(', ')}. Look for alternative angles and opportunities.`,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content || JSON.stringify({
              signals_summary: m.signals_summary,
              themes: m.themes,
            }),
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to generate more')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-more-${Date.now()}`,
        role: 'assistant',
        content: data.follow_up_response || 'Here are some alternative trail ideas:',
        themes: data.themes,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Generate more error:', error)
    } finally {
      setIsGeneratingMore(false)
    }
  }

  // Save all selected themes
  const handleSaveSelected = async () => {
    const allThemes = messages.flatMap(m => m.themes || [])
    const themesToSave = allThemes.filter(t => selectedThemes.has(t.title))

    for (const theme of themesToSave) {
      await handleSaveTheme(theme)
    }

    setSelectedThemes(new Set())
    setMode('exploring')
  }

  // Send quick question
  const handleQuickQuestion = async (question: string) => {
    if (isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/explore-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          user_message: question,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content || JSON.stringify({
              signals_summary: m.signals_summary,
              themes: m.themes,
            }),
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.follow_up_response || '',
        signals_summary: data.signals_summary,
        relevant_stakeholders: data.relevant_stakeholders,
        themes: data.themes,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Quick question error:', error)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an error. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Get all available themes from messages
  const allAvailableThemes = messages.flatMap(m => m.themes || [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <div className="flex items-center gap-3">
            <ScoutAIIcon size={24} className="text-scout-saddle" />
            <div>
              <h2 className="font-semibold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
                Explore Opportunities
              </h2>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {accountName} {industry && `· ${industry}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth-light)' }}
              title="Start fresh"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ backgroundColor: 'var(--scout-parchment)' }}
        >
          {messages.map(message => (
            <div key={message.id} className="space-y-3">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-xl px-4 py-3"
                    style={{ backgroundColor: 'var(--scout-saddle)', color: 'white' }}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Signals Summary */}
                  {message.signals_summary && message.signals_summary.length > 0 && (
                    <div
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                    >
                      <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-sky)' }}>
                        SIGNALS OBSERVED
                      </h4>
                      <ul className="space-y-1">
                        {message.signals_summary.map((signal, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2" style={{ color: 'var(--scout-earth)' }}>
                            <span className="text-sky-500 mt-1">•</span>
                            {signal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Relevant Stakeholders */}
                  {message.relevant_stakeholders && message.relevant_stakeholders.length > 0 && (
                    <div
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                    >
                      <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-trail)' }}>
                        KEY PLAYERS
                      </h4>
                      <div className="space-y-2">
                        {message.relevant_stakeholders.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                              style={{ backgroundColor: 'var(--scout-saddle)' }}
                            >
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                                {s.name}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                                {s.title} · {s.relevance}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Themes */}
                  {message.themes && message.themes.length > 0 && (
                    <div
                      className="rounded-xl p-4 border"
                      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-sunset)' }}
                    >
                      <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--scout-sunset)' }}>
                        TRAILS WORTH EXPLORING
                      </h4>
                      <div className="space-y-3">
                        {message.themes.map((theme, idx) => {
                          const sizeDisplay = getSizeDisplay(theme.suggested_size)
                          const isSelected = selectedThemes.has(theme.title)
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-lg border cursor-pointer transition-all"
                              style={{
                                borderColor: isSelected ? 'var(--scout-trail)' : 'var(--scout-border)',
                                backgroundColor: isSelected ? 'rgba(93, 122, 93, 0.05)' : 'transparent',
                              }}
                              onClick={() => toggleThemeSelection(theme.title)}
                            >
                              <div className="flex items-start gap-3">
                                {/* Selection checkbox */}
                                <div
                                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                                  style={{
                                    borderColor: isSelected ? 'var(--scout-trail)' : 'var(--scout-border)',
                                    backgroundColor: isSelected ? 'var(--scout-trail)' : 'transparent',
                                  }}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                                      {theme.title}
                                    </span>
                                    <span
                                      className="text-xs px-2 py-0.5 rounded font-medium ml-2 flex-shrink-0"
                                      style={{ backgroundColor: sizeDisplay.bg, color: sizeDisplay.color }}
                                    >
                                      {sizeDisplay.label}
                                    </span>
                                  </div>

                                  <p className="text-xs mb-1" style={{ color: 'var(--scout-earth)' }}>
                                    {theme.description}
                                  </p>

                                  {theme.why_it_matters && (
                                    <p className="text-xs italic" style={{ color: 'var(--scout-earth-light)' }}>
                                      Why: {theme.why_it_matters}
                                    </p>
                                  )}

                                  {theme.questions && theme.questions.length > 0 && (
                                    <details className="mt-2">
                                      <summary className="text-[10px] font-semibold cursor-pointer" style={{ color: 'var(--scout-sky)' }}>
                                        {theme.questions.length} questions to explore
                                      </summary>
                                      <ul className="mt-1 space-y-0.5 pl-2">
                                        {theme.questions.map((q, i) => (
                                          <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--scout-earth)' }}>
                                            <span style={{ color: 'var(--scout-sky)' }}>?</span>
                                            {q}
                                          </li>
                                        ))}
                                      </ul>
                                    </details>
                                  )}

                                  {/* Quick save button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSaveTheme(theme)
                                    }}
                                    disabled={savingTheme === theme.title}
                                    className="mt-2 text-xs py-1 px-3 rounded border transition-colors hover:bg-gray-50 disabled:opacity-50"
                                    style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                                  >
                                    {savingTheme === theme.title ? 'Saving...' : 'Save Trail'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Generate More Ideas button */}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={handleGenerateMore}
                          disabled={isGeneratingMore || isLoading}
                          className="flex-1 text-xs py-2 rounded border transition-colors hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ borderColor: 'var(--scout-sunset)', color: 'var(--scout-sunset)' }}
                        >
                          {isGeneratingMore ? (
                            <>
                              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Generate More Ideas
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Follow-up response text */}
                  {message.content && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: 'var(--scout-white)' }}
                    >
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--scout-earth)' }}>
                        {message.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-3" style={{ color: 'var(--scout-earth-light)' }}>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Analyzing account...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {/* Mode toggle - Continue exploring vs Finalize */}
          {selectedThemes.size > 0 && (
            <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ backgroundColor: 'rgba(93, 122, 93, 0.05)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>
                {selectedThemes.size} trail{selectedThemes.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedThemes(new Set())}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Clear
                </button>
                <button
                  onClick={handleSaveSelected}
                  disabled={savingTheme !== null}
                  className="text-xs px-3 py-1 rounded text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-trail)' }}
                >
                  Save Selected
                </button>
              </div>
            </div>
          )}

          {/* Quick question chips */}
          {mode === 'exploring' && !isLoading && messages.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Quick questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input row */}
          <div className="p-4 pt-2">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask a follow-up question..."
                className="flex-1 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-1 text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                Send
              </button>
            </div>

            {/* Mode toggle */}
            <div className="mt-3 flex items-center justify-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'exploring'}
                  onChange={() => setMode('exploring')}
                  className="w-3 h-3"
                  style={{ accentColor: 'var(--scout-sunset)' }}
                />
                <span className="text-xs" style={{ color: mode === 'exploring' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)' }}>
                  Continue exploring
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'finalizing'}
                  onChange={() => setMode('finalizing')}
                  className="w-3 h-3"
                  style={{ accentColor: 'var(--scout-trail)' }}
                />
                <span className="text-xs" style={{ color: mode === 'finalizing' ? 'var(--scout-trail)' : 'var(--scout-earth-light)' }}>
                  Finalize selection
                </span>
              </label>
            </div>

            <p className="mt-2 text-[10px] text-center" style={{ color: 'var(--scout-earth-light)' }}>
              {mode === 'exploring'
                ? 'AI helps you explore trails to investigate'
                : 'Select the trails you want to save, then click "Save Selected"'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
