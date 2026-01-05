import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

interface Goal {
  goal_id: string
  parent_goal_id: string | null
  name: string
  goal_type: string
  category: string | null
  vertical: string | null
  target_value: number
  target_year: number
  current_value: number
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function formatValue(value: number, goalType: string): string {
  if (goalType === 'revenue') return formatCurrency(value)
  return value.toLocaleString()
}

function getProgressColor(pct: number): string {
  if (pct >= 70) return 'var(--status-success)'
  if (pct >= 40) return 'var(--status-warning)'
  return 'var(--status-danger)'
}

function getProgressBg(pct: number): string {
  if (pct >= 70) return 'var(--status-success-bg)'
  if (pct >= 40) return 'var(--status-warning-bg)'
  return 'var(--status-danger-bg)'
}

function getStatusLabel(pct: number): string {
  if (pct >= 100) return 'Achieved'
  if (pct >= 70) return 'On Track'
  if (pct >= 40) return 'At Risk'
  return 'Off Track'
}

export default async function GoalsPage() {
  const supabase = await createClient()

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('is_active', true)
    .eq('target_year', 2026)
    .order('parent_goal_id', { ascending: true, nullsFirst: true })

  const allGoals = goals || []

  // Group goals by type and parent
  const revenueGoal = allGoals.find(g => g.goal_type === 'revenue' && !g.parent_goal_id)
  const revenueChildren = allGoals.filter(g => g.parent_goal_id === revenueGoal?.goal_id)
  const logoGoal = allGoals.find(g => g.goal_type === 'logos' && !g.parent_goal_id)
  const logoChildren = allGoals.filter(g => g.parent_goal_id === logoGoal?.goal_id)

  // Get sub-goals of revenue children (e.g., VigilantOps under Upsell)
  const getSubGoals = (parentId: string) => allGoals.filter(g => g.parent_goal_id === parentId)

  // Calculate totals
  const totalRevenue = revenueGoal?.target_value || 0
  const closedRevenue = revenueGoal?.current_value || 0
  const revenueProgress = totalRevenue > 0 ? Math.round((closedRevenue / totalRevenue) * 100) : 0

  const totalLogos = logoGoal?.target_value || 0
  const closedLogos = logoGoal?.current_value || 0
  const logoProgress = totalLogos > 0 ? Math.round((closedLogos / totalLogos) * 100) : 0

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            2026 Goals
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Revenue and logo targets for the fiscal year
          </p>
        </div>
        <Link
          href="/tam/gaps"
          className="text-sm font-medium px-3 py-1.5 rounded-md"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          View Gap Analysis
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Summary */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Revenue Target
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: getProgressBg(revenueProgress), color: getProgressColor(revenueProgress) }}
            >
              {getStatusLabel(revenueProgress)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>target</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(revenueProgress, 100)}%`,
                  backgroundColor: getProgressColor(revenueProgress)
                }}
              />
            </div>
            <span className="text-sm font-medium" style={{ color: getProgressColor(revenueProgress) }}>
              {revenueProgress}%
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {formatCurrency(closedRevenue)} closed
          </p>
        </div>

        {/* Logos Summary */}
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              New Logos Target
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: getProgressBg(logoProgress), color: getProgressColor(logoProgress) }}
            >
              {getStatusLabel(logoProgress)}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {totalLogos}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>logos</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(logoProgress, 100)}%`,
                  backgroundColor: getProgressColor(logoProgress)
                }}
              />
            </div>
            <span className="text-sm font-medium" style={{ color: getProgressColor(logoProgress) }}>
              {logoProgress}%
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {closedLogos} closed
          </p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Revenue Breakdown
        </h2>
        <div className="space-y-3">
          {revenueChildren.map((goal) => {
            const pct = goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0
            const subGoals = getSubGoals(goal.goal_id)

            return (
              <div key={goal.goal_id}>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {goal.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {formatCurrency(goal.current_value)} / {formatCurrency(goal.target_value)}
                        </span>
                        <span
                          className="text-xs font-medium w-12 text-right"
                          style={{ color: getProgressColor(pct) }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: getProgressColor(pct)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-goals (e.g., VigilantOps under Upsell) */}
                {subGoals.length > 0 && (
                  <div className="ml-4 mt-2 space-y-2 pl-3" style={{ borderLeft: '2px solid var(--border-primary)' }}>
                    {subGoals.map((sub) => {
                      const subPct = sub.target_value > 0 ? Math.round((sub.current_value / sub.target_value) * 100) : 0
                      return (
                        <div key={sub.goal_id} className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {sub.name}
                                {sub.vertical && (
                                  <span
                                    className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
                                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                                  >
                                    {sub.vertical}
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                  {formatCurrency(sub.current_value)} / {formatCurrency(sub.target_value)}
                                </span>
                                <span
                                  className="text-[11px] font-medium w-10 text-right"
                                  style={{ color: getProgressColor(subPct) }}
                                >
                                  {subPct}%
                                </span>
                              </div>
                            </div>
                            <div
                              className="h-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: 'var(--bg-tertiary)' }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(subPct, 100)}%`,
                                  backgroundColor: getProgressColor(subPct)
                                }}
                              />
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

        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <Link
            href="/tam/gaps"
            className="text-xs font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            View gap analysis to close revenue targets →
          </Link>
        </div>
      </div>

      {/* Logo Breakdown */}
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          New Logos Breakdown
        </h2>
        <div className="space-y-3">
          {logoChildren.map((goal) => {
            const pct = goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0

            return (
              <div key={goal.goal_id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {goal.name}
                      {goal.vertical && (
                        <span
                          className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                        >
                          {goal.vertical}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {goal.current_value} / {goal.target_value}
                      </span>
                      <span
                        className="text-xs font-medium w-12 text-right"
                        style={{ color: getProgressColor(pct) }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: getProgressColor(pct)
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Remaining logos (not assigned to specific vertical) */}
          {logoGoal && logoChildren.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Other (any vertical)
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {logoGoal.target_value - logoChildren.reduce((sum, c) => sum + c.target_value, 0)} remaining
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
          <Link
            href="/tam/list"
            className="text-xs font-medium"
            style={{ color: 'var(--accent-primary)' }}
          >
            Explore TAM accounts for new logos →
          </Link>
        </div>
      </div>
    </div>
  )
}
