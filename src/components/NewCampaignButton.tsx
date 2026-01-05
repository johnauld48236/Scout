'use client'

import { useState } from 'react'
import { CampaignModal } from './CampaignModal'

export function NewCampaignButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
      >
        + New Campaign
      </button>
      <CampaignModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
