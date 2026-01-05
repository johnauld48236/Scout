'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'assistant' | 'user'
  content: string
}

interface ProposedMilestone {
  text: string
  period: 'day_30' | 'day_60' | 'day_90'
  selected: boolean
  rationale?: string
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

interface PlanningWizardProps {
  accountPlanId: string
  accountName: string
  pursuits?: Pursuit[]
  existingContext?: ExistingContext
  onClose: () => void
  onComplete: () => void
}

export function PlanningWizard({
  accountPlanId,
  accountName,
  pursuits = [],
  existingContext = {},
  onClose,
  onComplete,
}: PlanningWizardProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [phase, setPhase] = useState<'loading' | 'chat' | 'review' | 'saving'>('loading')
  const [proposedMilestones, setProposedMilestones] = useState<ProposedMilestone[]>([])
  const [showContext, setShowContext] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Generate initial message based on context
  useEffect(() => {
    const generateInitialMessage = async () => {
      try {
        const response = await fetch('/api/ai/planning-wizard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountName,
            messages: [],
            existingContext,
            pursuits,
            generateOpener: true,
          }),
        })

        const data = await response.json()
        setMessages([{ role: 'assistant', content: data.message }])
        setPhase('chat')
      } catch (error) {
        console.error('Failed to generate opener:', error)
        // Build a basic status briefing from the context
        const riskCount = existingContext.risks?.length || 0
        const painPointCount = existingContext.painPoints?.length || 0
        const gapCount = existingContext.bantGaps?.length || 0
        const hasIssues = riskCount > 0 || painPointCount > 0 || gapCount > 0

        let fallbackMsg = `📊 **Account Status**\n`
        fallbackMsg += `• ${pursuits.length} active opportunit${pursuits.length === 1 ? 'y' : 'ies'}\n`
        if (hasIssues) {
          fallbackMsg += `• ${riskCount} open risk${riskCount !== 1 ? 's' : ''}, ${painPointCount} pain point${painPointCount !== 1 ? 's' : ''}\n`
          if (gapCount > 0) fallbackMsg += `• ${gapCount} qualification gap${gapCount !== 1 ? 's' : ''} to address\n`
        }
        fallbackMsg += `\n**Would you like to focus on addressing issues or pursuing growth opportunities?**`

        setMessages([{ role: 'assistant', content: fallbackMsg }])
        setPhase('chat')
      } finally {
        setIsLoading(false)
      }
    }

    generateInitialMessage()
  }, [accountName, existingContext, pursuits])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (phase === 'chat') {
      inputRef.current?.focus()
    }
  }, [phase])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/planning-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName,
          messages: [...messages, { role: 'user', content: userMessage }],
          existingContext,
          pursuits,
        }),
      })

      const data = await response.json()

      if (data.milestones && data.milestones.length > 0) {
        setProposedMilestones(data.milestones.map((m: { text: string; period: string; rationale?: string }) => ({
          ...m,
          selected: true,
        })))
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        setPhase('review')
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      }
    } catch (error) {
      console.error('Planning wizard error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error. Let's try again - what would you like to accomplish?"
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, accountName, existingContext, pursuits, isLoading])

  const toggleMilestone = (index: number) => {
    setProposedMilestones(prev => prev.map((m, i) =>
      i === index ? { ...m, selected: !m.selected } : m
    ))
  }

  const updateMilestoneText = (index: number, text: string) => {
    setProposedMilestones(prev => prev.map((m, i) =>
      i === index ? { ...m, text } : m
    ))
  }

  const updateMilestonePeriod = (index: number, period: 'day_30' | 'day_60' | 'day_90') => {
    setProposedMilestones(prev => prev.map((m, i) =>
      i === index ? { ...m, period } : m
    ))
  }

  const saveMilestones = useCallback(async () => {
    const selectedMilestones = proposedMilestones.filter(m => m.selected)
    if (selectedMilestones.length === 0) {
      onClose()
      return
    }

    setPhase('saving')

    try {
      const planRes = await fetch(`/api/accounts/${accountPlanId}/plan`)
      const planData = await planRes.json()

      const existingMilestones = planData.milestones || {
        day_30: [],
        day_60: [],
        day_90: [],
      }

      const updatedMilestones = { ...existingMilestones }
      selectedMilestones.forEach(m => {
        updatedMilestones[m.period].push({
          id: crypto.randomUUID(),
          text: m.text,
          completed: false,
        })
      })

      await fetch(`/api/accounts/${accountPlanId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: updatedMilestones }),
      })

      router.refresh()
      onComplete()
    } catch (error) {
      console.error('Failed to save milestones:', error)
      setPhase('review')
    }
  }, [proposedMilestones, accountPlanId, router, onComplete, onClose])

  const goBackToChat = () => {
    setPhase('chat')
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "No problem! What changes would you like to make to the plan?"
    }])
  }

  // Context summary for display
  const hasContext = existingContext.compellingEvents?.length ||
    existingContext.buyingSignals?.length ||
    existingContext.bantGaps?.length ||
    existingContext.accountThesis

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
          <div className="flex-1">
            <h2 className="font-semibold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
              90-Day Planning Wizard
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {accountName}
              </span>
              {existingContext.vertical && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}>
                  {existingContext.vertical}
                </span>
              )}
              {existingContext.campaignName && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}>
                  {existingContext.campaignName}
                </span>
              )}
            </div>
          </div>
          {hasContext && (
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-xs px-2 py-1 rounded border mr-2 flex items-center gap-1"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showContext ? 'Hide' : 'Show'} Context
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Context Panel (collapsible) */}
        {showContext && hasContext && (
          <div className="p-4 border-b bg-amber-50/50 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--scout-border)' }}>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Compelling Events */}
              {existingContext.compellingEvents && existingContext.compellingEvents.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--scout-sunset)' }}>Compelling Events</p>
                  <ul className="space-y-0.5">
                    {existingContext.compellingEvents.slice(0, 3).map((e, i) => (
                      <li key={i} className="flex items-start gap-1" style={{ color: 'var(--scout-earth)' }}>
                        <span className="text-[10px] mt-0.5">•</span>
                        <span>{e.event}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Buying Signals */}
              {existingContext.buyingSignals && existingContext.buyingSignals.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--scout-trail)' }}>Buying Signals</p>
                  <ul className="space-y-0.5">
                    {existingContext.buyingSignals.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1" style={{ color: 'var(--scout-earth)' }}>
                        <span className="text-[10px] mt-0.5">•</span>
                        <span>{s.signal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* BANT Gaps */}
              {existingContext.bantGaps && existingContext.bantGaps.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--scout-clay)' }}>Qualification Gaps</p>
                  <ul className="space-y-0.5">
                    {existingContext.bantGaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-1" style={{ color: 'var(--scout-earth)' }}>
                        <span className="text-[10px] mt-0.5">⚠</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pain Points */}
              {existingContext.painPoints && existingContext.painPoints.length > 0 && (
                <div>
                  <p className="font-medium mb-1" style={{ color: 'var(--scout-sunset)' }}>Pain Points</p>
                  <ul className="space-y-0.5">
                    {existingContext.painPoints.slice(0, 3).map((p, i) => (
                      <li key={i} className="flex items-start gap-1" style={{ color: 'var(--scout-earth)' }}>
                        <span className="text-[10px] mt-0.5">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Account Thesis */}
            {existingContext.accountThesis && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <p className="font-medium mb-1 text-xs" style={{ color: 'var(--scout-earth)' }}>Account Thesis</p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{existingContext.accountThesis}</p>
              </div>
            )}
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--scout-sunset)' }} />
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Analyzing account context...
              </p>
            </div>
          </div>
        )}

        {phase === 'chat' && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-amber-50 text-amber-900'
                        : ''
                    }`}
                    style={{
                      backgroundColor: msg.role === 'assistant' ? 'var(--scout-parchment)' : undefined,
                      color: msg.role === 'assistant' ? 'var(--scout-earth)' : undefined,
                    }}
                  >
                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                    }} />
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-lg px-4 py-3 text-sm"
                    style={{ backgroundColor: 'var(--scout-parchment)' }}
                  >
                    <span className="flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Describe your goals..."
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 rounded-lg text-white disabled:opacity-50 self-end"
                  style={{ backgroundColor: 'var(--scout-saddle)' }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--scout-earth-light)' }}>
                Enter to send • Shift+Enter for new line
              </p>
            </div>
          </>
        )}

        {phase === 'review' && (
          <>
            {/* Review Milestones */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <h3 className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                  Proposed 90-Day Plan
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                  Review and adjust milestones. Edit text or move between time periods as needed.
                </p>
              </div>

              <div className="space-y-4">
                {['day_30', 'day_60', 'day_90'].map(period => {
                  const periodMilestones = proposedMilestones.filter(m => m.period === period)
                  const periodLabel = period === 'day_30' ? 'First 30 Days' : period === 'day_60' ? '30-60 Days' : '60-90 Days'
                  const periodDesc = period === 'day_30' ? 'Immediate priorities' : period === 'day_60' ? 'Building momentum' : 'Closing activities'
                  const periodColor = period === 'day_30' ? 'var(--scout-clay)' : period === 'day_60' ? 'var(--scout-sunset)' : 'var(--scout-trail)'

                  return (
                    <div key={period}>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: periodColor }}
                        />
                        <span className="text-sm font-medium" style={{ color: periodColor }}>
                          {periodLabel}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                          — {periodDesc}
                        </span>
                      </div>

                      {periodMilestones.length === 0 ? (
                        <p className="text-xs py-2 pl-5" style={{ color: 'var(--scout-earth-light)' }}>
                          No milestones for this period
                        </p>
                      ) : (
                        <div className="space-y-2 pl-5">
                          {periodMilestones.map((m) => {
                            const globalIdx = proposedMilestones.indexOf(m)
                            return (
                              <div
                                key={globalIdx}
                                className={`p-3 rounded-lg border transition-all ${m.selected ? '' : 'opacity-50'}`}
                                style={{
                                  borderColor: m.selected ? periodColor : 'var(--scout-border)',
                                  backgroundColor: m.selected ? `${periodColor}08` : 'transparent',
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={m.selected}
                                    onChange={() => toggleMilestone(globalIdx)}
                                    className="mt-1 w-4 h-4 rounded"
                                    style={{ accentColor: periodColor }}
                                  />
                                  <div className="flex-1 space-y-2">
                                    <textarea
                                      value={m.text}
                                      onChange={(e) => updateMilestoneText(globalIdx, e.target.value)}
                                      className="w-full text-sm px-2 py-1.5 rounded border bg-white resize-none"
                                      style={{ borderColor: 'var(--scout-border)' }}
                                      disabled={!m.selected}
                                      rows={2}
                                    />
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={m.period}
                                        onChange={(e) => updateMilestonePeriod(globalIdx, e.target.value as 'day_30' | 'day_60' | 'day_90')}
                                        className="text-xs px-2 py-1 rounded border"
                                        style={{ borderColor: 'var(--scout-border)' }}
                                        disabled={!m.selected}
                                      >
                                        <option value="day_30">30 Days</option>
                                        <option value="day_60">60 Days</option>
                                        <option value="day_90">90 Days</option>
                                      </select>
                                      {m.rationale && (
                                        <span className="text-[10px] italic" style={{ color: 'var(--scout-earth-light)' }}>
                                          {m.rationale}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Review Actions */}
            <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
              <button
                onClick={goBackToChat}
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                ← Refine Plan
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveMilestones}
                  className="px-4 py-2 text-sm rounded-lg text-white"
                  style={{ backgroundColor: 'var(--scout-trail)' }}
                >
                  Add {proposedMilestones.filter(m => m.selected).length} Milestones
                </button>
              </div>
            </div>
          </>
        )}

        {phase === 'saving' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: 'var(--scout-trail)' }} />
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Creating your 90-day plan...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
