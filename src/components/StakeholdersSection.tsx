'use client'

import { useState } from 'react'
import { StakeholderModal } from './StakeholderModal'

interface Stakeholder {
  stakeholder_id: string
  account_plan_id: string
  full_name: string
  title?: string
  department?: string
  email?: string
  role_type?: string
  sentiment?: string
  engagement_level?: string
  influence_score?: number
  last_contact_date?: string
  reports_to_id?: string
  org_level?: number
}

interface StakeholdersSectionProps {
  accountPlanId: string
  stakeholders: Stakeholder[]
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    'Strong_Advocate': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Supportive': 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500',
    'Neutral': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    'Skeptical': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Opponent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Unknown': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[sentiment] || colors['Unknown']}`}>
      {sentiment.replace('_', ' ')}
    </span>
  )
}

function EngagementIndicator({ level }: { level: string }) {
  const colors: Record<string, string> = {
    'High': 'bg-green-500',
    'Medium': 'bg-yellow-500',
    'Low': 'bg-orange-500',
    'None': 'bg-zinc-300 dark:bg-zinc-600',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[level] || colors['None']}`} />
      <span className="text-zinc-500 dark:text-zinc-400">{level}</span>
    </div>
  )
}

export function StakeholdersSection({ accountPlanId, stakeholders }: StakeholdersSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)

  const handleEdit = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingStakeholder(null)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Stakeholders ({stakeholders.length})
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          + Add Stakeholder
        </button>
      </div>

      <div className="space-y-3">
        {stakeholders.map((stakeholder) => (
          <div
            key={stakeholder.stakeholder_id}
            className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{stakeholder.full_name}</h3>
                  {stakeholder.sentiment && (
                    <SentimentBadge sentiment={stakeholder.sentiment} />
                  )}
                </div>
                {stakeholder.title && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {stakeholder.title}{stakeholder.department ? ` · ${stakeholder.department}` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleEdit(stakeholder)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
              {stakeholder.role_type && (
                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                  {stakeholder.role_type.replace('_', ' ')}
                </span>
              )}
              {stakeholder.engagement_level && (
                <EngagementIndicator level={stakeholder.engagement_level} />
              )}
              {stakeholder.influence_score && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  Influence: {stakeholder.influence_score}/10
                </span>
              )}
              {stakeholder.last_contact_date && (
                <span className="text-zinc-500 dark:text-zinc-400">
                  Last: {new Date(stakeholder.last_contact_date).toLocaleDateString()}
                </span>
              )}
            </div>

            {stakeholder.email && (
              <div className="mt-2">
                <a href={`mailto:${stakeholder.email}`} className="text-sm text-blue-600 hover:underline">
                  {stakeholder.email}
                </a>
              </div>
            )}
          </div>
        ))}
        {stakeholders.length === 0 && (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm py-4">No stakeholders mapped</p>
        )}
      </div>

      <StakeholderModal
        isOpen={isModalOpen}
        onClose={handleClose}
        accountPlanId={accountPlanId}
        stakeholder={editingStakeholder}
        allStakeholders={stakeholders}
      />
    </section>
  )
}
