'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuickAIResearchButton } from './QuickAIResearchButton'

interface Signal {
  signal_id: string
  signal_type?: string
  title?: string
  summary: string
  source?: string
  confidence?: string
  category?: string
  signal_date: string
  stakeholder_id?: string
  pursuit_id?: string
  is_financial?: boolean
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface Division {
  division_id: string
  name: string
  parent_division_id?: string
}

interface SignalsSectionProps {
  accountId: string
  signals: Signal[]
  stakeholders?: Stakeholder[]
  pursuits?: Pursuit[]
  // For AI research
  accountName?: string
  website?: string | null
  industry?: string | null
  campaignContext?: string | null
  companyContext?: string | null
  divisions?: Division[]
}

export function SignalsSection({
  accountId,
  signals: initialSignals,
  stakeholders = [],
  pursuits = [],
  accountName,
  website,
  industry,
  campaignContext,
  companyContext,
  divisions = [],
}: SignalsSectionProps) {
  const router = useRouter()
  const [signals, setSignals] = useState(initialSignals)
  const [isExpanded, setIsExpanded] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (signalId: string) => {
    if (!confirm('Delete this signal?')) return
    setDeletingId(signalId)
    try {
      const response = await fetch(`/api/accounts/${accountId}/signals/${signalId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSignals(prev => prev.filter(s => s.signal_id !== signalId))
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete signal:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (signals.length === 0) return null

  // Group by category
  const categories = [...new Set(signals.map(s => s.category || s.signal_type || 'other'))]

  const filteredSignals = filter === 'all'
    ? signals
    : signals.filter(s => (s.category || s.signal_type) === filter)

  const getStakeholderName = (id?: string) => {
    if (!id) return null
    return stakeholders.find(s => s.stakeholder_id === id)?.full_name
  }

  const getPursuitName = (id?: string) => {
    if (!id) return null
    return pursuits.find(p => p.pursuit_id === id)?.name
  }

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'financial': { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)' },
      'people': { bg: 'rgba(56, 152, 199, 0.15)', text: 'var(--scout-sky)' },
      'competitive': { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)' },
      'regulatory': { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)' },
      'product': { bg: 'rgba(139, 115, 85, 0.15)', text: 'var(--scout-saddle)' },
      'strategic': { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)' },
      'news': { bg: 'var(--scout-parchment)', text: 'var(--scout-earth)' },
    }
    return colors[category || 'news'] || colors['news']
  }

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Research Signals
          </h3>
          <span
            className="px-2 py-0.5 text-[10px] rounded-full"
            style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
          >
            {signals.length}
          </span>
        </div>
        {accountName && (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickAIResearchButton
              accountId={accountId}
              accountName={accountName}
              website={website}
              industry={industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
              mode="signals"
              divisions={divisions}
              stakeholders={stakeholders.map(s => ({
                stakeholder_id: s.stakeholder_id,
                full_name: s.full_name,
              }))}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-3">
              <button
                onClick={(e) => { e.stopPropagation(); setFilter('all') }}
                className="px-2 py-0.5 text-[10px] rounded-full transition-colors"
                style={{
                  backgroundColor: filter === 'all' ? 'var(--scout-saddle)' : 'var(--scout-parchment)',
                  color: filter === 'all' ? 'white' : 'var(--scout-earth)',
                }}
              >
                All ({signals.length})
              </button>
              {categories.map(cat => {
                const count = signals.filter(s => (s.category || s.signal_type) === cat).length
                const colors = getCategoryColor(cat)
                return (
                  <button
                    key={cat}
                    onClick={(e) => { e.stopPropagation(); setFilter(cat) }}
                    className="px-2 py-0.5 text-[10px] rounded-full capitalize transition-colors"
                    style={{
                      backgroundColor: filter === cat ? colors.text : colors.bg,
                      color: filter === cat ? 'white' : colors.text,
                    }}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* Signals List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSignals.map(signal => {
              const colors = getCategoryColor(signal.category || signal.signal_type)
              const stakeholderName = getStakeholderName(signal.stakeholder_id)
              const pursuitName = getPursuitName(signal.pursuit_id)
              const isExpanded = expandedSignalId === signal.signal_id
              const isDeleting = deletingId === signal.signal_id

              return (
                <div
                  key={signal.signal_id}
                  className={`p-3 rounded-lg cursor-pointer transition-all group ${isDeleting ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: isExpanded ? 'var(--scout-white)' : 'var(--scout-parchment)', border: isExpanded ? '1px solid var(--scout-border)' : 'none' }}
                  onClick={() => setExpandedSignalId(isExpanded ? null : signal.signal_id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-1.5 py-0.5 text-[10px] rounded capitalize"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {signal.category || signal.signal_type}
                      </span>
                      {signal.confidence && (
                        <span
                          className="text-[10px]"
                          style={{
                            color: signal.confidence === 'high' ? 'var(--scout-trail)' :
                              signal.confidence === 'medium' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)'
                          }}
                        >
                          {signal.confidence}
                        </span>
                      )}
                      {signal.is_financial && (
                        <span className="text-[10px]" style={{ color: 'var(--scout-trail)' }}>
                          💰
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--scout-earth-light)' }}>
                        {new Date(signal.signal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {/* Delete button - visible on hover */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(signal.signal_id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-all"
                        title="Delete signal"
                        disabled={isDeleting}
                      >
                        <svg className="w-3 h-3" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {signal.title && (
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--scout-earth)' }}>
                      {signal.title}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {isExpanded ? signal.summary : (signal.summary.length > 150 ? signal.summary.slice(0, 150) + '...' : signal.summary)}
                  </p>

                  {/* Expanded view - full details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                      {signal.source && (
                        <p className="text-[10px] mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                          <span className="font-medium">Source:</span> {signal.source}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {stakeholderName && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                          >
                            👤 {stakeholderName}
                          </span>
                        )}
                        {pursuitName && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                          >
                            💼 {pursuitName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Collapsed view - compact links */}
                  {!isExpanded && (stakeholderName || pursuitName) && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {stakeholderName && (
                        <span className="text-[10px]" style={{ color: 'var(--scout-sky)' }}>
                          👤 {stakeholderName}
                        </span>
                      )}
                      {pursuitName && (
                        <span className="text-[10px]" style={{ color: 'var(--scout-trail)' }}>
                          💼 {pursuitName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
