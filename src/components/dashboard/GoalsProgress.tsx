'use client'

import Link from 'next/link'

interface Goal {
  goal_id: string
  name: string
  target_value: number
  current_value: number
  goal_type: string
  category?: string | null
  vertical?: string | null
}

interface GoalsProgressProps {
  goals: Goal[]
}

function formatValue(value: number, type: string): string {
  if (type === 'logos') {
    return value.toLocaleString()
  }
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getProgressColor(pct: number): string {
  if (pct >= 70) return 'var(--status-success)'
  if (pct >= 40) return 'var(--status-warning)'
  return 'var(--status-danger)'
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  if (goals.length === 0) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No goals configured. <Link href="/goals" style={{ color: 'var(--accent-primary)' }}>Create goals →</Link>
        </p>
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
          Company Goals
        </h2>
        <Link
          href="/goals"
          className="text-xs font-medium"
          style={{ color: 'var(--accent-primary)' }}
        >
          View all →
        </Link>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const pct = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0
          const progressColor = getProgressColor(pct)

          return (
            <div key={goal.goal_id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {goal.name}
                  </span>
                  {goal.vertical && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
                    >
                      {goal.vertical}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium" style={{ color: progressColor }}>
                  {Math.round(pct)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: progressColor
                    }}
                  />
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {formatValue(goal.current_value, goal.goal_type)} / {formatValue(goal.target_value, goal.goal_type)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
