'use client'

import { useState } from 'react'
import { LeadsImportReview } from './LeadsImportReview'

export function LeadsImportButton() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border hover:bg-gray-50 transition-colors"
        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        Import Leads
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <LeadsImportReview onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </>
  )
}

// Keep old export for backwards compatibility
export { LeadsImportButton as MedicalImportButton }
