'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AccountEnrichmentWorkflow } from './AccountEnrichmentWorkflow'

interface Campaign {
  campaign_id: string
  name: string
  type: string
  status?: string
  value_proposition?: string
  key_pain_points?: string
  regulatory_context?: string
  signal_triggers?: string
  target_verticals?: string[]
}

interface CompanyInfo {
  company_name: string
  website?: string
  industry?: string
  vertical?: string
  employee_count?: string | number
  headquarters?: string
  company_summary?: string
}

interface EnrichmentWizardModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountType: 'tam' | 'account_plan'
  initialData: CompanyInfo
  campaigns: Campaign[]
  initialCampaignIds?: string[]
}

export function EnrichmentWizardModal({
  isOpen,
  onClose,
  accountId,
  accountType,
  initialData,
  campaigns,
  initialCampaignIds = [],
}: EnrichmentWizardModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modal = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-3xl mx-4 my-8 rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--scout-parchment)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--scout-white)',
            borderColor: 'var(--scout-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
              >
                Build Account Plan
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {initialData.company_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          <AccountEnrichmentWorkflow
            accountId={accountId}
            accountType={accountType}
            initialData={initialData}
            campaigns={campaigns}
            initialCampaignIds={initialCampaignIds}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
