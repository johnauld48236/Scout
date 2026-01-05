'use client'

import { useState } from 'react'
import { PipelineImportReview } from './PipelineImportReview'

export function PipelineImportButton() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border hover:bg-gray-50 transition-colors"
        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import Pipeline
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-10 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <PipelineImportReview onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </>
  )
}
