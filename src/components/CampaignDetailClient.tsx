'use client'

import { useState } from 'react'
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
}

export function CampaignDetailClient({ campaign }: { campaign: Campaign }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
      >
        Edit Campaign
      </button>
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaign={campaign}
      />
    </>
  )
}
