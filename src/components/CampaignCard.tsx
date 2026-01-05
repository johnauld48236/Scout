'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CampaignModal } from './CampaignModal'

interface Campaign {
  campaign_id: string
  name: string
  type: string
  status: string
  target_verticals?: string[]
  target_geos?: string[]
  target_company_profile?: string
  regulatory_context?: string
  industry_dynamics?: string
  value_proposition?: string
  key_pain_points?: string
  signal_triggers?: string
  start_date?: string
  end_date?: string
  pipeline_goal?: number
  conversion_goal?: number
  pipelineValue: number
  pursuitCount: number
  tamCount: number
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'vertical': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'thematic': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || colors['vertical']}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'planned': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    'paused': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'completed': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors['planned']}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  // Check if campaign has context configured
  const hasContext = campaign.value_proposition || campaign.key_pain_points || campaign.signal_triggers

  return (
    <>
      <Link
        href={`/campaigns/${campaign.campaign_id}`}
        className="rounded-lg bg-white dark:bg-zinc-900 p-5 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors block relative group"
      >
        {/* Edit button - shows on hover */}
        <button
          onClick={handleEditClick}
          className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          title="Edit campaign"
        >
          <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>

        <div className="flex items-start justify-between mb-3 pr-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {campaign.name}
          </h2>
          <div className="flex gap-2">
            <TypeBadge type={campaign.type} />
            <StatusBadge status={campaign.status} />
          </div>
        </div>

        {/* Warning if no context configured */}
        {!hasContext && (
          <div className="mb-3 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              No value prop or pain points configured
            </p>
          </div>
        )}

        {campaign.target_verticals && campaign.target_verticals.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {campaign.target_verticals.map((vertical: string) => (
              <span
                key={vertical}
                className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400"
              >
                {vertical}
              </span>
            ))}
          </div>
        )}

        {/* Show snippet of value prop if available */}
        {campaign.value_proposition && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
            {campaign.value_proposition}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pipeline</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              ${campaign.pipelineValue.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Pursuits</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.pursuitCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">TAM Fit</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.tamCount}
            </p>
          </div>
        </div>

        {campaign.type === 'thematic' && campaign.start_date && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(campaign.start_date).toLocaleDateString()} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
            </p>
            {campaign.pipeline_goal && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-500">Goal Progress</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {Math.round((campaign.pipelineValue / campaign.pipeline_goal) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min((campaign.pipelineValue / campaign.pipeline_goal) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {campaign.type === 'vertical' && (
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Evergreen Campaign</p>
          </div>
        )}
      </Link>

      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaign={campaign}
      />
    </>
  )
}
