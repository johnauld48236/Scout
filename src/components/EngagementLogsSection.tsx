'use client'

import { useState } from 'react'
import { EngagementLogModal } from './EngagementLogModal'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface EngagementAttendee {
  stakeholder_id: string
  stakeholders: {
    full_name: string
    title?: string
  }
}

interface EngagementLog {
  engagement_id: string
  account_plan_id: string
  pursuit_id?: string
  engagement_type: string
  engagement_date: string
  duration_minutes?: number
  location?: string
  title?: string
  summary?: string
  key_moments?: string
  outcome?: string
  next_steps?: string
  our_attendees?: string[]
  created_at: string
  pursuits?: {
    name: string
  }
  engagement_attendees?: EngagementAttendee[]
}

interface EngagementLogsSectionProps {
  accountPlanId: string
  engagements: EngagementLog[]
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
}

const ENGAGEMENT_TYPE_ICONS: Record<string, string> = {
  call: '📞',
  meeting: '🤝',
  email: '📧',
  demo: '💻',
  presentation: '📊',
  conference: '🎪',
  lunch: '🍽️',
  workshop: '🛠️',
}

const ENGAGEMENT_TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  meeting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  email: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  demo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  presentation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  conference: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  lunch: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  workshop: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(minutes?: number): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function EngagementLogsSection({
  accountPlanId,
  engagements,
  stakeholders,
  pursuits,
}: EngagementLogsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEngagement, setEditingEngagement] = useState<EngagementLog | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(true) // Collapsed by default

  const handleEdit = (engagement: EngagementLog) => {
    setEditingEngagement(engagement)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingEngagement(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Sort by date descending (most recent first)
  const sortedEngagements = [...engagements].sort(
    (a, b) => new Date(b.engagement_date).getTime() - new Date(a.engagement_date).getTime()
  )

  // Get recent engagement types for summary
  const recentTypes = sortedEngagements.slice(0, 3).map(e => e.engagement_type)

  return (
    <section
      className="rounded-xl border"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Collapsible Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Engagement History
          </h2>
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            {engagements.length}
          </span>
          {/* Show recent activity summary when collapsed */}
          {isCollapsed && recentTypes.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              {recentTypes.map(t => ENGAGEMENT_TYPE_ICONS[t] || '📋').join(' ')} recent
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsModalOpen(true)
          }}
          className="px-2 py-1 text-xs font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
        >
          + Log
        </button>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-3">
        {sortedEngagements.map((engagement) => {
          const isExpanded = expandedId === engagement.engagement_id
          const hasDetails = engagement.summary || engagement.key_moments || engagement.outcome || engagement.next_steps
          const attendees = engagement.engagement_attendees || []

          return (
            <div
              key={engagement.engagement_id}
              className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* Header Row */}
              <div
                className={`p-4 ${hasDetails ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : ''}`}
                onClick={() => hasDetails && toggleExpand(engagement.engagement_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Type Badge */}
                    <div className={`px-2 py-1 rounded text-sm font-medium ${ENGAGEMENT_TYPE_COLORS[engagement.engagement_type] || 'bg-zinc-100 text-zinc-700'}`}>
                      {ENGAGEMENT_TYPE_ICONS[engagement.engagement_type] || '📋'}{' '}
                      {engagement.engagement_type.charAt(0).toUpperCase() + engagement.engagement_type.slice(1)}
                    </div>

                    {/* Title and Metadata */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                          {engagement.title || `${engagement.engagement_type.charAt(0).toUpperCase() + engagement.engagement_type.slice(1)} on ${formatDate(engagement.engagement_date)}`}
                        </h3>
                        {engagement.pursuits?.name && (
                          <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {engagement.pursuits.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <span>{formatDate(engagement.engagement_date)}</span>
                        {engagement.duration_minutes && (
                          <span>• {formatDuration(engagement.duration_minutes)}</span>
                        )}
                        {engagement.location && (
                          <span>• {engagement.location}</span>
                        )}
                      </div>

                      {/* Attendees */}
                      {attendees.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-zinc-500">With:</span>
                          <div className="flex flex-wrap gap-1">
                            {attendees.slice(0, 3).map((a) => (
                              <span
                                key={a.stakeholder_id}
                                className="px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              >
                                {a.stakeholders.full_name}
                              </span>
                            ))}
                            {attendees.length > 3 && (
                              <span className="text-xs text-zinc-500">+{attendees.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(engagement)
                      }}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    {hasDetails && (
                      <svg
                        className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && hasDetails && (
                <div className="px-4 pb-4 pt-0 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  {engagement.summary && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Summary
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{engagement.summary}</p>
                    </div>
                  )}

                  {engagement.key_moments && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Key Moments
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                        {engagement.key_moments}
                      </p>
                    </div>
                  )}

                  {engagement.outcome && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Outcome
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{engagement.outcome}</p>
                    </div>
                  )}

                  {engagement.next_steps && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                        Next Steps
                      </h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{engagement.next_steps}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {engagements.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--scout-earth-light)' }}>
            <p className="text-sm">No engagements logged yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-sm mt-2"
              style={{ color: 'var(--scout-sky)' }}
            >
              Log your first engagement →
            </button>
          </div>
        )}
        </div>
      )}

      <EngagementLogModal
        isOpen={isModalOpen}
        onClose={handleClose}
        accountPlanId={accountPlanId}
        pursuits={pursuits}
        stakeholders={stakeholders}
        engagementLog={editingEngagement}
      />
    </section>
  )
}
