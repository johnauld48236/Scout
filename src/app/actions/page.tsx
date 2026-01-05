import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In_Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Cancelled': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status || 'Open']}`}>
      {(status || 'Open').replace(/_/g, ' ')}
    </span>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  const colors: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Low': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority || 'Medium']}`}>
      {priority || 'Medium'}
    </span>
  )
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === 'Completed' || status === 'Cancelled') return false
  return new Date(dueDate) < new Date()
}

export default async function ActionsPage() {
  const supabase = await createClient()

  const [actionsRes, accountsRes, pursuitsRes] = await Promise.all([
    supabase.from('action_items').select('*').order('due_date', { ascending: true }),
    supabase.from('account_plans').select('account_plan_id, account_name'),
    supabase.from('pursuits').select('pursuit_id, name'),
  ])

  const actions = actionsRes.data || []
  const accounts = accountsRes.data || []
  const pursuits = pursuitsRes.data || []

  // Create lookup maps
  const accountMap = new Map(accounts.map(a => [a.account_plan_id, a.account_name]))
  const pursuitMap = new Map(pursuits.map(p => [p.pursuit_id, p.name]))

  if (actionsRes.error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Action Items</h1>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Error loading actions: {actionsRes.error.message}
        </div>
      </div>
    )
  }

  // Sort: Open/In_Progress first, then by priority, then by due date
  const sortedActions = [...actions].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'Open': 0, 'In_Progress': 1, 'Blocked': 2, 'Completed': 3, 'Cancelled': 4 }
    const priorityOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 }

    const statusDiff = (statusOrder[a.status || 'Open'] || 0) - (statusOrder[b.status || 'Open'] || 0)
    if (statusDiff !== 0) return statusDiff

    const priorityDiff = (priorityOrder[a.priority || 'Medium'] || 2) - (priorityOrder[b.priority || 'Medium'] || 2)
    if (priorityDiff !== 0) return priorityDiff

    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })

  // Group by status for summary
  const statusGroups = actions.reduce((acc, a) => {
    const status = a.status || 'Open'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const openCount = actions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length
  const overdueCount = actions.filter(a => isOverdue(a.due_date, a.status)).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Action Items</h1>
        <div className="flex items-center gap-4">
          {overdueCount > 0 && (
            <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
              {overdueCount} overdue
            </div>
          )}
          <p className="text-zinc-500 dark:text-zinc-400">{openCount} open</p>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(Object.entries(statusGroups) as [string, number][]).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{count}</span>
          </div>
        ))}
      </div>

      {/* Actions Table */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Task</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Account</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Pursuit</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Due Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedActions.map((action) => (
              <tr
                key={action.action_id}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  action.status === 'Completed' || action.status === 'Cancelled' ? 'opacity-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/accounts/${action.account_plan_id}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                  >
                    {action.title}
                  </Link>
                  {action.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs">
                      {action.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {accountMap.get(action.account_plan_id) || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {action.pursuit_id ? pursuitMap.get(action.pursuit_id) || '-' : '-'}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={action.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={action.priority} />
                </td>
                <td className="px-4 py-3">
                  {action.due_date ? (
                    <span className={`text-sm ${
                      isOverdue(action.due_date, action.status)
                        ? 'text-red-600 font-medium'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {new Date(action.due_date).toLocaleDateString()}
                      {isOverdue(action.due_date, action.status) && ' (Overdue)'}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {action.assigned_to || '-'}
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No action items yet. Create actions from account detail pages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
