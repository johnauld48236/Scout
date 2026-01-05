'use client'

import Link from 'next/link'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'

interface PlanStatusCardProps {
  accountPlanId: string
  planStatus?: 'draft' | 'active' | 'completed' | 'archived' | null
  planCompleteness?: number
  planningPeriodStart?: string
  planningPeriodEnd?: string
  activatedAt?: string
}

export function PlanStatusCard({
  accountPlanId,
  planStatus,
  planCompleteness = 0,
  planningPeriodStart,
  planningPeriodEnd,
}: PlanStatusCardProps) {
  const isActive = planStatus === 'active'
  const isCompleted = planStatus === 'completed'

  // Calculate days remaining if active
  const daysRemaining = planningPeriodEnd
    ? Math.max(0, Math.ceil((new Date(planningPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  // Calculate progress (days elapsed / 90)
  const daysPassed = planningPeriodStart
    ? Math.ceil((Date.now() - new Date(planningPeriodStart).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const timeProgress = Math.min(100, Math.round((daysPassed / 90) * 100))

  if (isActive || isCompleted) {
    return (
      <div
        className="mb-6 p-4 rounded-lg border"
        style={{
          backgroundColor: isCompleted ? 'rgba(93, 122, 93, 0.1)' : 'var(--scout-parchment)',
          borderColor: isCompleted ? 'var(--scout-trail)' : 'var(--scout-saddle)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScoutTerrainMark className="w-8 h-4" color="brown" />
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-semibold"
                  style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                >
                  90-Day Plan
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: isCompleted
                      ? 'rgba(93, 122, 93, 0.2)'
                      : 'rgba(139, 69, 19, 0.2)',
                    color: isCompleted ? 'var(--scout-trail)' : 'var(--scout-saddle)',
                  }}
                >
                  {isCompleted ? 'Completed' : 'Active'}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {isCompleted
                  ? 'Plan period has ended'
                  : daysRemaining !== null
                  ? `${daysRemaining} days remaining`
                  : 'Plan in progress'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Progress */}
            {isActive && (
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${timeProgress}%`,
                        backgroundColor: 'var(--scout-saddle)',
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                    Day {daysPassed}
                  </span>
                </div>
              </div>
            )}

            {/* Plan Completeness */}
            <div className="text-right">
              <p
                className="text-xl font-bold"
                style={{
                  color: planCompleteness >= 80 ? 'var(--scout-trail)' : 'var(--scout-sunset)',
                }}
              >
                {planCompleteness}%
              </p>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                Complete
              </p>
            </div>

            <Link
              href={`/accounts/${accountPlanId}/plan`}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              View Plan
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Draft or no plan - show "Start Planning" button
  return (
    <div
      className="mb-6 p-4 rounded-lg border border-dashed flex items-center justify-between"
      style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
    >
      <div className="flex items-center gap-3">
        <ScoutTerrainMark className="w-8 h-4" color="dark" />
        <div>
          <h3
            className="font-semibold"
            style={{ color: 'var(--scout-earth)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            90-Day Account Plan
          </h3>
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            {planStatus === 'draft'
              ? `Plan ${planCompleteness}% complete - continue building your strategy`
              : 'Create a structured plan to win this account'}
          </p>
        </div>
      </div>

      <Link
        href={`/accounts/${accountPlanId}/plan`}
        className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all flex items-center gap-2"
        style={{
          background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
          boxShadow: '0 4px 14px rgba(139, 69, 19, 0.3)',
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {planStatus === 'draft' ? 'Continue Planning' : 'Start Planning'}
      </Link>
    </div>
  )
}
