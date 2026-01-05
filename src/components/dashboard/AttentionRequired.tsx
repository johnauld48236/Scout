'use client'

import Link from 'next/link'

interface AttentionItem {
  type: 'stale_plan' | 'overdue_action' | 'stalled_deal' | 'at_risk_goal'
  title: string
  subtitle?: string
  link: string
  daysOld?: number
}

interface AttentionRequiredProps {
  items: AttentionItem[]
  stalePlans: number
  overdueActions: number
  stalledDeals: number
}

function getTypeConfig(type: AttentionItem['type']) {
  switch (type) {
    case 'stale_plan':
      return {
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        ),
        color: 'var(--status-warning)',
        bg: 'var(--status-warning-bg)',
        label: 'Stale Plan'
      }
    case 'overdue_action':
      return {
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'var(--status-danger)',
        bg: 'var(--status-danger-bg)',
        label: 'Overdue'
      }
    case 'stalled_deal':
      return {
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        color: 'var(--status-danger)',
        bg: 'var(--status-danger-bg)',
        label: 'Stalled'
      }
    case 'at_risk_goal':
      return {
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        ),
        color: 'var(--status-warning)',
        bg: 'var(--status-warning-bg)',
        label: 'At Risk'
      }
    default:
      return {
        icon: null,
        color: 'var(--text-tertiary)',
        bg: 'var(--bg-tertiary)',
        label: 'Issue'
      }
  }
}

export function AttentionRequired({
  items,
  stalePlans,
  overdueActions,
  stalledDeals
}: AttentionRequiredProps) {
  const totalIssues = stalePlans + overdueActions + stalledDeals

  if (totalIssues === 0) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'var(--status-success-bg)' }}
          >
            <svg className="w-4 h-4" style={{ color: 'var(--status-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              All Clear
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No items requiring immediate attention
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Attention Required
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
        >
          {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Summary Pills */}
      <div className="flex gap-2 mb-4">
        {stalePlans > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-md"
            style={{ backgroundColor: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}
          >
            {stalePlans} stale {stalePlans === 1 ? 'plan' : 'plans'}
          </span>
        )}
        {overdueActions > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-md"
            style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
          >
            {overdueActions} overdue
          </span>
        )}
        {stalledDeals > 0 && (
          <span
            className="text-xs px-2 py-1 rounded-md"
            style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
          >
            {stalledDeals} stalled
          </span>
        )}
      </div>

      {/* Item List */}
      <div className="space-y-2">
        {items.slice(0, 5).map((item, idx) => {
          const config = getTypeConfig(item.type)
          return (
            <Link
              key={idx}
              href={item.link}
              className="flex items-center gap-3 p-2 rounded-md transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.title}
                </p>
                {item.subtitle && (
                  <p
                    className="text-xs truncate"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {item.subtitle}
                  </p>
                )}
              </div>
              {item.daysOld && (
                <span
                  className="text-xs shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.daysOld}d
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {items.length > 5 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <Link
            href="/actions"
            className="text-xs font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            View all {items.length} items →
          </Link>
        </div>
      )}
    </div>
  )
}
