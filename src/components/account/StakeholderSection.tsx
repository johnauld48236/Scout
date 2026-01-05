'use client'

import { useState, useCallback, useEffect } from 'react'
import { StakeholderCard } from './StakeholderQuickEdit'
import { AvailableContactsPicker } from './AvailableContactsPicker'
import { StakeholderDrawer } from '@/components/drawers/StakeholderDrawer'
import { QuickAIResearchButton } from './QuickAIResearchButton'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  business_unit?: string
  department?: string
  division_id?: string
  is_placeholder?: boolean
  placeholder_role?: string
  notes?: string
  profile_notes?: string
  relationship_strength?: string
  purchasing_authority?: string
}

interface Division {
  division_id: string
  name: string
  description?: string
  division_type?: string
  parent_division_id?: string
}

interface StakeholderSectionProps {
  accountPlanId: string
  stakeholders: Stakeholder[]
  divisions?: Division[]
  // For AI search
  accountName?: string
  website?: string | null
  industry?: string | null
  campaignContext?: string | null
  companyContext?: string | null
}

export function StakeholderSection({
  accountPlanId,
  stakeholders: initialStakeholders,
  divisions = [],
  accountName,
  website,
  industry,
  campaignContext,
  companyContext,
}: StakeholderSectionProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [isExpanded, setIsExpanded] = useState(true)

  // Sync state when props change (e.g., after router.refresh())
  useEffect(() => {
    setStakeholders(initialStakeholders)
  }, [initialStakeholders])
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const realStakeholders = stakeholders.filter(s => !s.is_placeholder)
  const placeholders = stakeholders.filter(s => s.is_placeholder)

  const handleStakeholderClick = useCallback((stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder)
    setDrawerOpen(true)
  }, [])

  const handleStakeholderSave = useCallback((updated: Stakeholder) => {
    setStakeholders(prev => prev.map(s =>
      s.stakeholder_id === updated.stakeholder_id ? updated : s
    ))
  }, [])

  const handleStakeholderDelete = useCallback((id: string) => {
    setStakeholders(prev => prev.filter(s => s.stakeholder_id !== id))
  }, [])

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header - Clickable to expand/collapse */}
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3
          className="font-semibold flex items-center gap-2"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          Stakeholders ({realStakeholders.length})
        </h3>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {accountName && (
            <QuickAIResearchButton
              accountId={accountPlanId}
              accountName={accountName}
              website={website}
              industry={industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
              mode="people"
              stakeholders={realStakeholders.map(s => ({
                stakeholder_id: s.stakeholder_id,
                full_name: s.full_name,
                title: s.title,
              }))}
              divisions={divisions.map(d => ({
                division_id: d.division_id,
                name: d.name,
                parent_division_id: d.parent_division_id,
              }))}
            />
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 flex items-center gap-1"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            title="Add from imported contacts"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Find Contacts
          </button>
        </div>
      </div>

      {/* Content - Collapsible */}
      {isExpanded && (
        <>
      {realStakeholders.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {realStakeholders.map(s => (
            <StakeholderCard
              key={s.stakeholder_id}
              stakeholder={s}
              onEdit={() => handleStakeholderClick(s)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            No stakeholders mapped yet.
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            Find contacts to add →
          </button>
        </div>
      )}
      {/* Gaps */}
      {placeholders.length > 0 && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-sunset)' }}>
            {placeholders.length} roles to identify:
          </p>
          <div className="space-y-1">
            {placeholders.slice(0, 3).map(s => (
              <p key={s.stakeholder_id} className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                • {s.placeholder_role || s.title}
              </p>
            ))}
          </div>
        </div>
      )}
        </>
      )}

      {/* Stakeholder Drawer */}
      <StakeholderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stakeholder={selectedStakeholder}
        accountPlanId={accountPlanId}
        divisions={divisions}
        onSave={handleStakeholderSave}
        onDelete={handleStakeholderDelete}
      />

      {/* Contact Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPicker(false)}
          />
          <div className="relative z-10 w-full max-w-lg mx-4">
            <AvailableContactsPicker
              accountPlanId={accountPlanId}
              onClose={() => setShowPicker(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
