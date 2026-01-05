'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface TrackerItemData {
  id: string
  type: 'milestone' | 'risk' | 'pain_point'
  text: string
  date?: string | null
  severity?: string
  status?: string
  completed?: boolean
  pursuit_id?: string | null
  pursuit_name?: string
  isOverdue?: boolean
}

interface TrackerItemProps {
  item: TrackerItemData
  accountPlanId: string
  allMilestones?: {
    day_30: Array<{ id: string; text: string; completed: boolean }>
    day_60: Array<{ id: string; text: string; completed: boolean }>
    day_90: Array<{ id: string; text: string; completed: boolean }>
  }
  period?: 'day_30' | 'day_60' | 'day_90'
  onDateChange?: (itemId: string, itemType: string, newDate: string) => Promise<void>
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
}

const TYPE_STYLES = {
  milestone: {
    bg: 'rgba(93, 122, 93, 0.1)',
    border: 'var(--scout-trail)',
    icon: null,
  },
  risk: {
    bg: 'rgba(169, 68, 66, 0.15)',
    border: 'var(--scout-clay)',
    icon: null,
  },
  pain_point: {
    bg: 'rgba(210, 105, 30, 0.1)',
    border: 'var(--scout-sunset)',
    icon: null,
  },
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400' },
  high: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400' },
  significant: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-400' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400' },
  moderate: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-400' },
  low: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400' },
  minor: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400' },
}

export function TrackerItem({
  item,
  accountPlanId,
  allMilestones,
  period,
  onDateChange,
  draggable = false,
  onDragStart,
}: TrackerItemProps) {
  const [isCompleted, setIsCompleted] = useState(item.completed || false)
  const [isPending, startTransition] = useTransition()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateValue, setDateValue] = useState(item.date || '')
  const router = useRouter()

  const style = TYPE_STYLES[item.type]
  const severityStyle = item.severity ? SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium : null

  // Handle milestone completion toggle
  const handleMilestoneToggle = async () => {
    if (item.type !== 'milestone' || !allMilestones || !period) return

    const newCompleted = !isCompleted
    setIsCompleted(newCompleted)

    const updatedMilestones = {
      ...allMilestones,
      [period]: allMilestones[period].map(m =>
        m.id === item.id ? { ...m, completed: newCompleted } : m
      ),
    }

    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: updatedMilestones }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        setIsCompleted(!newCompleted)
      }
    } catch {
      setIsCompleted(!newCompleted)
    }
  }

  // Handle date change for risks/pain points
  const handleDateSubmit = async () => {
    if (!onDateChange || !dateValue) return

    try {
      await onDateChange(item.id, item.type, dateValue)
      setShowDatePicker(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Failed to update date:', error)
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`flex items-start gap-2 p-2 rounded transition-all ${isPending ? 'opacity-50' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        backgroundColor: style.bg,
        borderLeft: `3px solid ${style.border}`,
      }}
    >
      {/* Checkbox for milestones */}
      {item.type === 'milestone' && (
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleMilestoneToggle}
          disabled={isPending}
          className="w-4 h-4 mt-0.5 rounded cursor-pointer flex-shrink-0"
          style={{ accentColor: 'var(--scout-trail)' }}
        />
      )}

      {/* Type icon for risks/pain points */}
      {item.type === 'risk' && (
        <span className="text-sm flex-shrink-0" title="Risk">⚠️</span>
      )}
      {item.type === 'pain_point' && (
        <span className="text-sm flex-shrink-0" title="Pain Point">🔴</span>
      )}

      <div className="flex-1 min-w-0">
        {/* Main text */}
        <span
          className={`text-sm block truncate ${item.type === 'milestone' && isCompleted ? 'line-through' : ''}`}
          style={{ color: item.type === 'milestone' && isCompleted ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
          title={item.text}
        >
          {item.text}
        </span>

        {/* Meta row: severity, pursuit, overdue */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {severityStyle && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${severityStyle.bg} ${severityStyle.text}`}>
              {item.severity}
            </span>
          )}
          {item.pursuit_name && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)', color: 'var(--scout-trail)' }}
            >
              {item.pursuit_name}
            </span>
          )}
          {item.isOverdue && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              Overdue
            </span>
          )}
        </div>

        {/* Inline date picker */}
        {showDatePicker && item.type !== 'milestone' && (
          <div className="flex items-center gap-1 mt-2">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <button
              onClick={handleDateSubmit}
              className="text-xs px-2 py-1 rounded"
              style={{ backgroundColor: 'var(--scout-trail)', color: 'white' }}
            >
              Set
            </button>
            <button
              onClick={() => setShowDatePicker(false)}
              className="text-xs px-2 py-1 text-zinc-500"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Date edit button for risks/pain points */}
      {item.type !== 'milestone' && !showDatePicker && onDateChange && (
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--scout-earth-light)' }}
          title="Set target date"
        >
          📅
        </button>
      )}
    </div>
  )
}
