'use client'

interface ActionItem {
  status: string
  due_date: string | null
}

interface AccountPlan {
  account_plan_id: string
  account_name: string
  updated_at?: string
  created_at?: string
  pursuits?: { count: number }[]
  action_items?: ActionItem[]
  stakeholders?: { count: number }[]
}

interface PlanHealthMetricsProps {
  accountPlans: AccountPlan[]
}

export function PlanHealthMetrics({ accountPlans }: PlanHealthMetricsProps) {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Calculate metrics
  const total = accountPlans.length

  // Stale plans: not updated in 14+ days
  const stalePlans = accountPlans.filter(plan => {
    const updatedAt = plan.updated_at ? new Date(plan.updated_at) : null
    return updatedAt && updatedAt < fourteenDaysAgo
  })

  // Plans needing attention: updated 7-14 days ago
  const needsAttention = accountPlans.filter(plan => {
    const updatedAt = plan.updated_at ? new Date(plan.updated_at) : null
    return updatedAt && updatedAt < sevenDaysAgo && updatedAt >= fourteenDaysAgo
  })

  // Plans with overdue actions
  const plansWithOverdue = accountPlans.filter(plan => {
    if (!plan.action_items || !Array.isArray(plan.action_items)) return false
    return plan.action_items.some(action => {
      if (!action.due_date || action.status === 'Completed') return false
      return new Date(action.due_date) < now
    })
  })

  // Incomplete plans: no stakeholders AND no pursuits
  const incompletePlans = accountPlans.filter(plan => {
    const pursuitCount = Array.isArray(plan.pursuits) && plan.pursuits[0]?.count || 0
    const stakeholderCount = Array.isArray(plan.stakeholders) && plan.stakeholders[0]?.count || 0
    return pursuitCount === 0 && stakeholderCount === 0
  })

  // Active/healthy plans
  const activePlans = accountPlans.filter(plan => {
    const updatedAt = plan.updated_at ? new Date(plan.updated_at) : null
    return updatedAt && updatedAt >= sevenDaysAgo
  })

  if (total === 0) return null

  return (
    <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4" style={{ color: 'var(--scout-saddle)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
          Plan Health
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Plans */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--scout-saddle)' }}>{total}</p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Total Plans</p>
        </div>

        {/* Active Plans */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--scout-trail)' }}>{activePlans.length}</p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Active (7d)</p>
        </div>

        {/* Needs Attention */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: needsAttention.length > 0 ? 'rgba(210, 105, 30, 0.1)' : 'var(--scout-parchment)' }}>
          <p className="text-2xl font-bold" style={{ color: needsAttention.length > 0 ? 'var(--scout-sunset)' : 'var(--scout-earth-light)' }}>
            {needsAttention.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Needs Attention</p>
        </div>

        {/* Stale Plans */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: stalePlans.length > 0 ? 'rgba(169, 68, 66, 0.1)' : 'var(--scout-parchment)' }}>
          <p className="text-2xl font-bold" style={{ color: stalePlans.length > 0 ? 'var(--scout-clay)' : 'var(--scout-earth-light)' }}>
            {stalePlans.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Stale (14d+)</p>
        </div>

        {/* Overdue Actions */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: plansWithOverdue.length > 0 ? 'rgba(169, 68, 66, 0.1)' : 'var(--scout-parchment)' }}>
          <p className="text-2xl font-bold" style={{ color: plansWithOverdue.length > 0 ? 'var(--scout-clay)' : 'var(--scout-earth-light)' }}>
            {plansWithOverdue.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Overdue Actions</p>
        </div>

        {/* Incomplete */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: incompletePlans.length > 0 ? 'rgba(210, 105, 30, 0.1)' : 'var(--scout-parchment)' }}>
          <p className="text-2xl font-bold" style={{ color: incompletePlans.length > 0 ? 'var(--scout-sunset)' : 'var(--scout-earth-light)' }}>
            {incompletePlans.length}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Incomplete</p>
        </div>
      </div>

      {/* Alert section for stale or overdue plans */}
      {(stalePlans.length > 0 || plansWithOverdue.length > 0) && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {stalePlans.length > 0 && (
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--scout-clay)' }}>
                  Stale plans requiring review:
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {stalePlans.slice(0, 5).map(p => p.account_name).join(', ')}
                  {stalePlans.length > 5 && ` +${stalePlans.length - 5} more`}
                </p>
              </div>
            </div>
          )}
          {plansWithOverdue.length > 0 && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--scout-clay)' }}>
                  Plans with overdue actions:
                </p>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {plansWithOverdue.slice(0, 5).map(p => p.account_name).join(', ')}
                  {plansWithOverdue.length > 5 && ` +${plansWithOverdue.length - 5} more`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
