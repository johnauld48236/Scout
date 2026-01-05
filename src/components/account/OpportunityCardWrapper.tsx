'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
  analysis_date?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  description?: string
  thesis?: string
  estimated_value?: number
  stage?: string
  probability?: number
  target_close_date?: string
  notes?: string
  pursuit_type?: string
  deal_owner?: string
  deal_type?: string
  target_quarter?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  role_type?: string
  sentiment?: string
}

interface Action {
  action_id: string
  title: string
  status?: string
  due_date?: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getBANTColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)', label: 'Strong' }
  if (score >= 50) return { bg: 'rgba(74, 144, 164, 0.15)', text: 'var(--scout-sky)', label: 'Developing' }
  if (score >= 25) return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)', label: 'Weak' }
  return { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)', label: 'Unknown' }
}

function getScoreLabel(score: number): string {
  if (score >= 25) return 'Confirmed'
  if (score >= 15) return 'Partial'
  return 'Unknown'
}

function getScoreButtonColor(score: number) {
  if (score >= 25) return { bg: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)', border: 'var(--scout-trail)' }
  if (score >= 15) return { bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)', border: 'var(--scout-sunset)' }
  return { bg: 'var(--scout-parchment)', color: 'var(--scout-earth-light)', border: 'var(--scout-border)' }
}

export function OpportunityCardWrapper({
  pursuit,
  stakeholders,
  actions,
  bantScore,
  onBantUpdate,
  onEdit,
}: {
  pursuit: Pursuit
  stakeholders: Stakeholder[]
  actions: Action[]
  bantScore?: BANTScore
  onBantUpdate?: (newScore: BANTScore) => void
  onEdit?: () => void
}) {
  const router = useRouter()
  const [bantExpanded, setBantExpanded] = useState(false)
  const [bantNotes, setBantNotes] = useState('')
  const [savingBant, setSavingBant] = useState(false)
  const [localBant, setLocalBant] = useState({
    budget_score: bantScore?.budget_score || 0,
    authority_score: bantScore?.authority_score || 0,
    need_score: bantScore?.need_score || 0,
    timeline_score: bantScore?.timeline_score || 0,
  })

  const pendingActions = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled')

  const stages = ['Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won']
  const currentStageIndex = stages.indexOf(pursuit.stage || 'Discovery')

  // Calculate BANT total using local state for immediate feedback
  const bantTotal = localBant.budget_score + localBant.authority_score + localBant.need_score + localBant.timeline_score
  const bantStyle = getBANTColor(bantTotal)

  // Identify BANT gaps (scores < 25)
  const bantGaps = [
    { key: 'B', label: 'Budget', score: localBant.budget_score },
    { key: 'A', label: 'Authority', score: localBant.authority_score },
    { key: 'N', label: 'Need', score: localBant.need_score },
    { key: 'T', label: 'Timeline', score: localBant.timeline_score },
  ].filter(g => g.score < 25)

  // Key stakeholders (champions and economic buyers)
  const keyStakeholders = stakeholders.filter(s =>
    s.role_type === 'Champion' || s.role_type === 'Economic Buyer'
  ).slice(0, 3)

  // Save BANT inline
  const handleSaveBant = useCallback(async () => {
    setSavingBant(true)
    const supabase = createClient()

    try {
      await supabase.from('bant_analyses').insert({
        pursuit_id: pursuit.pursuit_id,
        analysis_date: new Date().toISOString(),
        budget_score: localBant.budget_score,
        authority_score: localBant.authority_score,
        need_score: localBant.need_score,
        timeline_score: localBant.timeline_score,
        notes: bantNotes || null,
        analysis_source: 'Inline Update',
      })

      onBantUpdate?.(localBant as BANTScore)
      setBantExpanded(false)
      setBantNotes('')
      router.refresh()
    } catch (err) {
      console.error('Failed to save BANT:', err)
    } finally {
      setSavingBant(false)
    }
  }, [pursuit.pursuit_id, localBant, bantNotes, onBantUpdate, router])

  const hasChanges = bantScore
    ? (localBant.budget_score !== (bantScore.budget_score || 0) ||
       localBant.authority_score !== (bantScore.authority_score || 0) ||
       localBant.need_score !== (bantScore.need_score || 0) ||
       localBant.timeline_score !== (bantScore.timeline_score || 0))
    : bantTotal > 0

  return (
    <>
      <details className="group">
        <summary
          className="p-3 rounded-lg border cursor-pointer list-none hover:border-blue-300 transition-colors"
          style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
        >
          {/* Compact Header Row */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Name + Stage */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className="font-semibold text-sm text-left truncate"
                style={{ color: 'var(--scout-earth)' }}
              >
                {pursuit.name}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
              >
                {pursuit.stage || 'Discovery'}
              </span>
            </div>

            {/* Right: BANT + Value + Chevron */}
            <div className="flex items-center gap-2 shrink-0">
              {bantTotal > 0 ? (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: bantStyle.bg, color: bantStyle.text }}
                >
                  {bantTotal}
                </span>
              ) : (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                >
                  ?
                </span>
              )}
              <span className="font-bold text-sm" style={{ color: 'var(--scout-trail)' }}>
                {pursuit.estimated_value ? formatCurrency(pursuit.estimated_value) : '—'}
              </span>
              <svg
                className="w-3 h-3 transition-transform group-open:rotate-180"
                style={{ color: 'var(--scout-earth-light)' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Stage Progress - inline */}
          <div className="flex gap-0.5 mt-2">
            {stages.map((stage, i) => (
              <div
                key={stage}
                className="flex-1 h-1 rounded-full"
                style={{
                  backgroundColor: i <= currentStageIndex ? 'var(--scout-trail)' : 'var(--scout-border)',
                }}
              />
            ))}
          </div>

          {/* Quick Stats - compact */}
          {(bantGaps.length > 0 || pendingActions.length > 0) && (
            <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--scout-earth-light)' }}>
              {bantGaps.length > 0 && (
                <span style={{ color: 'var(--scout-sunset)' }}>
                  ⚠ Gaps: {bantGaps.map(g => g.key).join('')}
                </span>
              )}
              {pendingActions.length > 0 && (
                <span>{pendingActions.length} actions</span>
              )}
            </div>
          )}
        </summary>

        {/* Expanded Content */}
        <div className="px-4 pb-4 border-x border-b rounded-b-lg" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}>

          {/* Deal Metadata Row */}
          {(pursuit.deal_owner || pursuit.deal_type || pursuit.target_quarter) && (
            <div className="pt-3 pb-2 flex flex-wrap gap-3 text-xs border-b" style={{ borderColor: 'var(--scout-border)' }}>
              {pursuit.deal_owner && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span style={{ color: 'var(--scout-earth)' }}>{pursuit.deal_owner}</span>
                </div>
              )}
              {pursuit.deal_type && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                >
                  {pursuit.deal_type}
                </span>
              )}
              {pursuit.target_quarter && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}
                >
                  {pursuit.target_quarter}
                </span>
              )}
              {pursuit.pursuit_type && pursuit.pursuit_type !== 'new_business' && (
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: pursuit.pursuit_type === 'renewal' || pursuit.pursuit_type === 'recurring'
                      ? 'rgba(93, 122, 93, 0.15)'
                      : 'rgba(210, 105, 30, 0.15)',
                    color: pursuit.pursuit_type === 'renewal' || pursuit.pursuit_type === 'recurring'
                      ? 'var(--scout-trail)'
                      : 'var(--scout-sunset)',
                  }}
                >
                  {pursuit.pursuit_type === 'renewal' ? 'Renewal' : pursuit.pursuit_type === 'expansion' ? 'Expansion' : 'Recurring'}
                </span>
              )}
            </div>
          )}

          {/* BANT Health - Inline Expandable */}
          <div className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--scout-earth-light)' }}>
                Qualification Health
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setBantExpanded(!bantExpanded)
                }}
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: 'var(--scout-sky)' }}
              >
                {bantExpanded ? 'Close' : bantTotal === 0 ? 'Add BANT' : 'Update'}
                <svg
                  className={`w-3 h-3 transition-transform ${bantExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* BANT Summary Grid - Always visible */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'B', label: 'Budget', score: localBant.budget_score, field: 'budget_score' as const },
                { key: 'A', label: 'Authority', score: localBant.authority_score, field: 'authority_score' as const },
                { key: 'N', label: 'Need', score: localBant.need_score, field: 'need_score' as const },
                { key: 'T', label: 'Timeline', score: localBant.timeline_score, field: 'timeline_score' as const },
              ].map(item => {
                const isGap = item.score < 25
                const itemColor = item.score >= 25 ? 'var(--scout-trail)' : item.score >= 15 ? 'var(--scout-sunset)' : 'var(--scout-clay)'
                return (
                  <div
                    key={item.key}
                    className={`text-center p-3 rounded-lg border ${isGap ? 'border-dashed' : ''}`}
                    style={{
                      backgroundColor: 'var(--scout-parchment)',
                      borderColor: isGap ? itemColor : 'transparent'
                    }}
                  >
                    <div className="text-2xl font-bold" style={{ color: itemColor }}>
                      {item.key}
                    </div>
                    <div className="text-xs mt-1" style={{ color: itemColor }}>
                      {getScoreLabel(item.score)}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Inline BANT Editor - Fold Down */}
            {bantExpanded && (
              <div
                className="mt-3 p-4 rounded-lg border space-y-4"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
              >
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Score each: <strong>Yes</strong> (25) = Confirmed, <strong>Partial</strong> (15) = Some evidence, <strong>No</strong> (0) = Unknown
                </p>

                {[
                  { key: 'B', label: 'Budget', desc: 'Is there approved budget?', field: 'budget_score' as const },
                  { key: 'A', label: 'Authority', desc: 'Talking to decision makers?', field: 'authority_score' as const },
                  { key: 'N', label: 'Need', desc: 'Compelling business need?', field: 'need_score' as const },
                  { key: 'T', label: 'Timeline', desc: 'Urgency to act?', field: 'timeline_score' as const },
                ].map(item => {
                  const score = localBant[item.field]
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>{item.label}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--scout-earth-light)' }}>{item.desc}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: getScoreButtonColor(score).color }}>
                          {score}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {[0, 15, 25].map(value => {
                          const isSelected = score === value
                          const colors = getScoreButtonColor(value)
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setLocalBant(prev => ({ ...prev, [item.field]: value }))
                              }}
                              className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                              style={{
                                backgroundColor: isSelected ? colors.bg : 'var(--scout-white)',
                                color: isSelected ? colors.color : 'var(--scout-earth-light)',
                                border: `1px solid ${isSelected ? colors.border : 'var(--scout-border)'}`,
                              }}
                            >
                              {value === 0 ? 'No' : value === 15 ? 'Partial' : 'Yes'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                    Notes (optional)
                  </label>
                  <textarea
                    value={bantNotes}
                    onChange={(e) => setBantNotes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm rounded border resize-none"
                    style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
                    placeholder="Key qualification insights, blockers discovered..."
                  />
                </div>

                {/* Save/Cancel Row */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                  <div className="text-sm">
                    <span style={{ color: 'var(--scout-earth-light)' }}>Total: </span>
                    <span className="font-bold" style={{ color: bantStyle.text }}>{bantTotal}/100</span>
                    <span className="ml-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                      ({bantStyle.label})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setBantExpanded(false)
                        setLocalBant({
                          budget_score: bantScore?.budget_score || 0,
                          authority_score: bantScore?.authority_score || 0,
                          need_score: bantScore?.need_score || 0,
                          timeline_score: bantScore?.timeline_score || 0,
                        })
                        setBantNotes('')
                      }}
                      className="px-3 py-1.5 text-xs rounded border hover:bg-gray-50"
                      style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveBant()
                      }}
                      disabled={savingBant || !hasChanges}
                      className="px-3 py-1.5 text-xs rounded text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--scout-saddle)' }}
                    >
                      {savingBant ? 'Saving...' : 'Save BANT'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gap Priorities (if any gaps exist) */}
          {bantGaps.length > 0 && (
            <div className="py-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--scout-sunset)' }}>
                Gap Priorities
              </p>
              <div className="space-y-2">
                {bantGaps.map(gap => (
                  <div key={gap.key} className="flex items-start gap-2">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                    >
                      {gap.key}
                    </span>
                    <div className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      <span className="font-medium">{gap.label}</span>
                      <span style={{ color: 'var(--scout-earth-light)' }}>
                        {' — '}
                        {gap.score === 0 ? 'Not validated' : 'Partially confirmed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Actions Preview */}
          {pendingActions.length > 0 && (
            <div className="py-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Upcoming Actions
              </p>
              <div className="space-y-1">
                {pendingActions.slice(0, 3).map(action => (
                  <div key={action.action_id} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--scout-sky)' }} />
                    <span style={{ color: 'var(--scout-earth)' }}>{action.title}</span>
                    {action.due_date && (
                      <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        {new Date(action.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
                {pendingActions.length > 3 && (
                  <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    +{pendingActions.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Key Stakeholders */}
          {keyStakeholders.length > 0 && (
            <div className="py-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Key Stakeholders
              </p>
              <div className="flex flex-wrap gap-2">
                {keyStakeholders.map(s => (
                  <div
                    key={s.stakeholder_id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                  >
                    <span>{s.full_name}</span>
                    {s.role_type && (
                      <span style={{ color: 'var(--scout-earth-light)' }}>({s.role_type})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Opportunity Button */}
          {onEdit && (
            <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--scout-border)' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--scout-sky)' }}
              >
                Edit Opportunity →
              </button>
            </div>
          )}
        </div>
      </details>
    </>
  )
}
