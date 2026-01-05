'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface MilestoneCheckboxProps {
  accountPlanId: string
  period: 'day_30' | 'day_60' | 'day_90'
  milestoneId: string
  text: string
  isCompleted: boolean
  allMilestones: {
    day_30: Array<{ id: string; text: string; completed: boolean }>
    day_60: Array<{ id: string; text: string; completed: boolean }>
    day_90: Array<{ id: string; text: string; completed: boolean }>
  }
}

export function MilestoneCheckbox({
  accountPlanId,
  period,
  milestoneId,
  text,
  isCompleted: initialCompleted,
  allMilestones,
}: MilestoneCheckboxProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggle = async () => {
    const newCompleted = !isCompleted
    setIsCompleted(newCompleted)

    // Update the milestone in the milestones object
    const updatedMilestones = {
      ...allMilestones,
      [period]: allMilestones[period].map(m =>
        m.id === milestoneId ? { ...m, completed: newCompleted } : m
      ),
    }

    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestones: updatedMilestones,
        }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        setIsCompleted(initialCompleted)
        console.error('Failed to update milestone')
      }
    } catch (error) {
      setIsCompleted(initialCompleted)
      console.error('Error updating milestone:', error)
    }
  }

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded transition-opacity ${isPending ? 'opacity-50' : ''}`}
    >
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleToggle}
        disabled={isPending}
        className="w-4 h-4 mt-0.5 rounded cursor-pointer"
        style={{ accentColor: 'var(--scout-trail)' }}
      />
      <span
        className={`text-sm flex-1 ${isCompleted ? 'line-through' : ''}`}
        style={{ color: isCompleted ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
      >
        {text}
      </span>
    </div>
  )
}
