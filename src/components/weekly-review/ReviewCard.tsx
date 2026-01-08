'use client'

import Link from 'next/link'

interface ReviewAccount {
  account_plan_id: string
  account_name: string
  is_favorite: boolean
  last_reviewed_at: string | null
  pipeline_value: number
  opportunity_count: number
  stakeholder_count: number
  overdue_action_count: number
  this_week_action_count: number
  open_risk_count: number
  critical_risk_count: number
  days_since_engagement: number | null
  engagements_this_week: number
  unresolved_notes_count: number
  bant_gaps: string[]
  avg_bant_score: number | null
  pipeline_change: number | null
  needs_attention: boolean
  pursuits: Array<{
    pursuit_id: string
    name: string
    stage: string
    estimated_value: number
  }>
  risks: Array<{
    risk_id: string
    description: string
    severity: string
  }>
  notes: Array<{
    note_id: string
    note_text: string
    note_type: string
    created_at: string
  }>
  recent_engagements: Array<{
    engagement_id: string
    engagement_type: string
    engagement_date: string
    title: string
  }>
  overdue_actions: Array<{
    action_id: string
    title: string
    due_date: string
  }>
  this_week_actions: Array<{
    action_id: string
    title: string
    due_date: string
  }>
  bant_by_pursuit: Record<string, { B: number; A: number; N: number; T: number }>
}

interface ReviewCardProps {
  account: ReviewAccount
  isExpanded: boolean
  onToggleExpand: () => void
  onMarkReviewed: () => void
  onToggleFavorite: () => void
  onRemoveFromReview: () => void
  onAddNote: () => void
  formatCurrency: (value: number) => string
}

export function ReviewCard({
  account,
  isExpanded,
  onToggleExpand,
  onMarkReviewed,
  onToggleFavorite,
  onRemoveFromReview,
  onAddNote,
  formatCurrency,
}: ReviewCardProps) {
  const getEngagementStatus = () => {
    if (account.days_since_engagement === null) return { text: 'No engagements', color: 'var(--scout-earth-light)' }
    if (account.days_since_engagement > 7) return { text: `${account.days_since_engagement} days ago`, color: 'var(--scout-clay)' }
    if (account.days_since_engagement > 3) return { text: `${account.days_since_engagement} days ago`, color: 'var(--scout-sunset)' }
    return { text: `${account.days_since_engagement} days ago`, color: 'var(--scout-trail)' }
  }

  const engagementStatus = getEngagementStatus()

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: account.needs_attention ? 'rgba(169, 68, 66, 0.02)' : 'white',
        borderColor: account.needs_attention ? 'rgba(169, 68, 66, 0.3)' : 'var(--scout-border)',
      }}
    >
      {/* Collapsed View */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Favorite Star */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              className="p-1 hover:bg-yellow-50 rounded transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill={account.is_favorite ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: account.is_favorite ? '#f59e0b' : 'var(--scout-earth-light)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Account Info */}
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/accounts/${account.account_plan_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                >
                  {account.account_name}
                </Link>
                {account.last_reviewed_at && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                  >
                    Reviewed {new Date(account.last_reviewed_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Alert Badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {account.overdue_action_count > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                  >
                    {account.overdue_action_count} overdue
                  </span>
                )}
                {account.critical_risk_count > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                  >
                    {account.critical_risk_count} critical risk{account.critical_risk_count > 1 ? 's' : ''}
                  </span>
                )}
                {account.bant_gaps.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                  >
                    BANT gap: {account.bant_gaps.join(', ')}
                  </span>
                )}
                {account.this_week_action_count > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}
                  >
                    {account.this_week_action_count} due this week
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Side Metrics */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-semibold" style={{ color: 'var(--scout-trail)' }}>
                {formatCurrency(account.pipeline_value)}
              </p>
              {account.pipeline_change !== null && account.pipeline_change !== 0 && (
                <p
                  className="text-xs"
                  style={{ color: account.pipeline_change > 0 ? 'var(--scout-trail)' : 'var(--scout-clay)' }}
                >
                  {account.pipeline_change > 0 ? '+' : ''}{formatCurrency(account.pipeline_change)} WoW
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm" style={{ color: engagementStatus.color }}>
                Last: {engagementStatus.text}
              </p>
              {account.engagements_this_week > 0 && (
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {account.engagements_this_week} this week
                </p>
              )}
            </div>

            {/* Notes Badge */}
            <button
              onClick={(e) => { e.stopPropagation(); onAddNote() }}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              title="Add/view notes"
            >
              <svg className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {account.unresolved_notes_count > 0 && (
                <span
                  className="text-xs px-1.5 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--scout-sunset)', color: 'white' }}
                >
                  {account.unresolved_notes_count}
                </span>
              )}
            </button>

            {/* Expand Arrow */}
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--scout-earth-light)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-0 border-t"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <div className="grid grid-cols-3 gap-6 pt-4">
            {/* Opportunities */}
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                OPPORTUNITIES ({account.opportunity_count})
              </h4>
              <div className="space-y-2">
                {account.pursuits.slice(0, 4).map(p => {
                  const bant = account.bant_by_pursuit[p.pursuit_id]
                  const bantTotal = bant ? bant.B + bant.A + bant.N + bant.T : 0
                  return (
                    <div key={p.pursuit_id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--scout-earth)' }}>{p.name}</span>
                        <span className="text-xs" style={{ color: 'var(--scout-trail)' }}>
                          {formatCurrency(p.estimated_value || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
                        >
                          {p.stage || 'Discovery'}
                        </span>
                        {bantTotal > 0 && (
                          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                            BANT: {bantTotal}/100
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Actions & Risks */}
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                THIS WEEK
              </h4>

              {account.overdue_actions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-clay)' }}>
                    Overdue
                  </p>
                  {account.overdue_actions.slice(0, 3).map(a => (
                    <p key={a.action_id} className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      • {a.title}
                    </p>
                  ))}
                </div>
              )}

              {account.this_week_actions.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-sky)' }}>
                    Due This Week
                  </p>
                  {account.this_week_actions.slice(0, 3).map(a => (
                    <p key={a.action_id} className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      • {a.title}
                    </p>
                  ))}
                </div>
              )}

              {account.risks.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-sunset)' }}>
                    Open Risks ({account.open_risk_count})
                  </p>
                  {account.risks.slice(0, 2).map(r => (
                    <p key={r.risk_id} className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{
                          backgroundColor: r.severity === 'critical' ? 'var(--scout-clay)'
                            : r.severity === 'high' ? '#dc2626'
                            : 'var(--scout-sunset)',
                        }}
                      />
                      {(r.description || '').length > 60 ? (r.description || '').slice(0, 60) + '...' : r.description}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Recent Activity */}
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                NOTES & ACTIVITY
              </h4>

              {account.notes.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-sunset)' }}>
                    Unresolved Notes
                  </p>
                  {account.notes.slice(0, 2).map(n => (
                    <p key={n.note_id} className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      • {n.note_text.length > 50 ? n.note_text.slice(0, 50) + '...' : n.note_text}
                    </p>
                  ))}
                </div>
              )}

              {account.recent_engagements.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                    Recent Engagements
                  </p>
                  {account.recent_engagements.map(e => (
                    <p key={e.engagement_id} className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      {e.engagement_type}: {e.title || new Date(e.engagement_date).toLocaleDateString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* External Links Row */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
              External:
            </span>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth)' }}
              title="CRM integration coming soon"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Open in CRM
              <span className="px-1 py-0.5 bg-gray-100 rounded text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                Soon
              </span>
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--scout-earth)' }}
              title="Jira integration coming soon"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              View Tasks
              <span className="px-1 py-0.5 bg-gray-100 rounded text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                Soon
              </span>
            </a>
          </div>

          {/* Actions Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <div className="flex items-center gap-2">
              <Link
                href={`/accounts/${account.account_plan_id}`}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
                style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
              >
                View Account
              </Link>
              <button
                onClick={onAddNote}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                + Add Note
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRemoveFromReview}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Remove from Review
              </button>
              <button
                onClick={onMarkReviewed}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
