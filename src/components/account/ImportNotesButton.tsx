'use client'

import { useState } from 'react'
import { ImportMeetingNotes } from './ImportMeetingNotes'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Props {
  accountId: string
  accountName: string
  existingStakeholders: string[]
}

export function ImportNotesButton({ accountId, accountName, existingStakeholders }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 hover:scale-105 group"
        style={{
          background: 'linear-gradient(135deg, rgba(210, 105, 30, 0.15) 0%, rgba(139, 69, 19, 0.1) 100%)',
          border: '1px solid rgba(210, 105, 30, 0.4)',
          color: 'var(--scout-sunset)',
          boxShadow: '0 2px 8px rgba(210, 105, 30, 0.2)',
        }}
        title="Use AI to parse meeting notes and extract insights"
      >
        <ScoutAIIcon size={16} className="group-hover:animate-pulse" />
        Import Notes
      </button>

      {showModal && (
        <ImportMeetingNotes
          accountId={accountId}
          accountName={accountName}
          existingStakeholders={existingStakeholders}
          onClose={() => setShowModal(false)}
          onImportComplete={() => {}}
        />
      )}
    </>
  )
}
