'use client'

import Link from 'next/link'

interface IntelligenceSummaryProps {
  // TAM Intelligence metrics
  tamAccountCount: number
  highPriorityCount: number
  recentSignals: number
  estimatedOpportunity: number
  // Account Plan metrics
  activeAccountPlans: number
  accountsNeedingAttention: number
  openPursuits: number
  // Gap context
  newBusinessGap: number
  upsellGap: number
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function IntelligenceSummary({
  tamAccountCount,
  highPriorityCount,
  recentSignals,
  estimatedOpportunity,
  activeAccountPlans,
  accountsNeedingAttention,
  openPursuits,
  newBusinessGap,
  upsellGap
}: IntelligenceSummaryProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Filling the Gap
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TAM Intelligence - For New Business */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: 'var(--status-info-bg)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  TAM Intelligence
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  New Business Pipeline
                </p>
              </div>
            </div>
            {newBusinessGap > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
              >
                Gap: {formatCurrency(newBusinessGap)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {tamAccountCount.toLocaleString()}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>TAM Accounts</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--status-warning)' }}>
                {highPriorityCount}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>High Priority</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {recentSignals}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Signals (7d)</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--status-success)' }}>
                {formatCurrency(estimatedOpportunity)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Est. Opportunity</p>
            </div>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <Link
              href="/tam/list"
              className="text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              Explore TAM accounts →
            </Link>
          </div>
        </div>

        {/* Account Plans - For Upsell/Renewal */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: 'var(--status-success-bg)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--status-success)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Account Plans
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Upsell & Renewal Pipeline
                </p>
              </div>
            </div>
            {upsellGap > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
              >
                Gap: {formatCurrency(upsellGap)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeAccountPlans}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Active Plans</p>
            </div>
            <div>
              <p
                className="text-2xl font-semibold"
                style={{ color: accountsNeedingAttention > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}
              >
                {accountsNeedingAttention}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Need Attention</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--accent-primary)' }}>
                {openPursuits}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Open Pursuits</p>
            </div>
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-muted)' }}>
                -
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Upsell Identified</p>
            </div>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <Link
              href="/accounts"
              className="text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              View account plans →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
