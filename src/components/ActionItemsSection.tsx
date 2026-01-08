'use client'

import { useState } from 'react'
import { ActionItemModal } from './ActionItemModal'

interface ActionItem {
  action_id: string
  account_plan_id: string
  pursuit_id?: string
  title: string
  description?: string
  priority?: string
  status?: string
  owner?: string
  assigned_to?: string
  due_date?: string
  notes?: string
  blockers?: string
  bucket_type?: string  // 'account' | 'renewal' | 'upsell' | 'general'
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface ActionItemsSectionProps {
  accountPlanId: string
  actionItems: ActionItem[]
  pursuits: Pursuit[]
}

function StatusBadge({ status }: { status?: string }) {
  const colors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'In_Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Cancelled': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    'Blocked': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status || 'Open'] || colors['Open']}`}>
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
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[priority || 'Medium'] || colors['Medium']}`}>
      {priority || 'Medium'}
    </span>
  )
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === 'Completed' || status === 'Cancelled') return false
  return new Date(dueDate) < new Date()
}

export function ActionItemsSection({ accountPlanId, actionItems, pursuits }: ActionItemsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null)

  const handleEdit = (item: ActionItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  // Sort: Open/In_Progress first, then by priority, then by due date
  const sortedItems = [...actionItems].sort((a, b) => {
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

  const openCount = actionItems.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Action Items ({openCount} open)
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + Add Action
        </button>
      </div>

      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Task</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Due Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Assigned To</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedItems.map((action) => (
              <tr
                key={action.action_id}
                className={action.status === 'Completed' || action.status === 'Cancelled' ? 'opacity-50' : ''}
              >
                <td className="px-4 py-3">
                  <div className="text-sm text-zinc-900 dark:text-zinc-100">{action.title}</div>
                  {action.description && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs">
                      {action.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={action.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={action.priority} />
                </td>
                <td className="px-4 py-3">
                  {action.due_date ? (
                    <span className={`text-sm ${isOverdue(action.due_date, action.status) ? 'text-red-600 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
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
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleEdit(action)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {actionItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No action items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ActionItemModal
        isOpen={isModalOpen}
        onClose={handleClose}
        accountPlanId={accountPlanId}
        pursuits={pursuits}
        actionItem={editingItem}
      />
    </section>
  )
}
