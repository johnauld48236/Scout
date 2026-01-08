'use client'

import { useState } from 'react'
import { Plus, Compass, User } from 'lucide-react'
import { StakeholderDrawer } from '@/components/drawers/StakeholderDrawer'

interface Division {
  division_id: string
  name: string
}

interface Stakeholder {
  stakeholder_id: string
  account_plan_id?: string
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
  power_level?: string
  interest_level?: string
}

interface CompassContextCardProps {
  accountId: string
  stakeholders: Stakeholder[]
  divisions: Division[]
  onUpdate: () => void
}

const SENTIMENT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  champion: { label: 'Champion', bg: 'bg-green-100', text: 'text-green-700' },
  supporter: { label: 'Supporter', bg: 'bg-blue-100', text: 'text-blue-700' },
  neutral: { label: 'Neutral', bg: 'bg-gray-100', text: 'text-gray-700' },
  skeptic: { label: 'Skeptic', bg: 'bg-orange-100', text: 'text-orange-700' },
  blocker: { label: 'Blocker', bg: 'bg-red-100', text: 'text-red-700' },
}

const POWER_LEVELS: Record<string, string> = {
  high: 'H',
  medium: 'M',
  low: 'L',
}

export function CompassContextCard({
  accountId,
  stakeholders,
  divisions,
  onUpdate,
}: CompassContextCardProps) {
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Filter to confirmed contacts only (not placeholders/waypoints)
  const confirmedStakeholders = stakeholders.filter(s => !s.is_placeholder)

  const handleStakeholderClick = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder)
    setIsAddingNew(false)
    setIsDrawerOpen(true)
  }

  const handleAddStakeholder = () => {
    setSelectedStakeholder(null)
    setIsAddingNew(true)
    setIsDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
    setSelectedStakeholder(null)
    setIsAddingNew(false)
  }

  const handleDrawerSave = () => {
    onUpdate()
    handleDrawerClose()
  }

  const handleDivisionChange = async (stakeholderId: string, divisionId: string | undefined) => {
    setUpdatingId(stakeholderId)
    try {
      const response = await fetch('/api/stakeholders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: stakeholderId,
          division_id: divisionId || null, // API expects null for clearing
        }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update stakeholder division:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const getDivisionName = (divisionId: string | undefined) => {
    if (!divisionId) return null
    const division = divisions.find(d => d.division_id === divisionId)
    return division?.name || null
  }

  const renderStakeholderCard = (stakeholder: Stakeholder) => {
    const sentimentConfig = SENTIMENT_CONFIG[stakeholder.sentiment || 'neutral'] || SENTIMENT_CONFIG.neutral
    const powerLevel = stakeholder.power_level ? POWER_LEVELS[stakeholder.power_level] : '-'
    const interestLevel = stakeholder.interest_level ? POWER_LEVELS[stakeholder.interest_level] : '-'
    const isUpdating = updatingId === stakeholder.stakeholder_id

    return (
      <div
        key={stakeholder.stakeholder_id}
        className="p-2 rounded-lg border hover:shadow-sm transition-all"
        style={{ borderColor: 'var(--scout-border)' }}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: Name, Title */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => handleStakeholderClick(stakeholder)}
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--scout-earth-light)' }} />
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--scout-saddle)' }}
              >
                {stakeholder.full_name}
              </span>
            </div>
            {stakeholder.title && (
              <div
                className="text-xs truncate ml-5.5 mt-0.5"
                style={{ color: 'var(--scout-earth-light)', marginLeft: '22px' }}
              >
                {stakeholder.title}
              </div>
            )}
          </div>

          {/* Right: Sentiment + P/I */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${sentimentConfig.bg} ${sentimentConfig.text}`}>
              {sentimentConfig.label}
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
              title={`Power: ${stakeholder.power_level || 'unset'}, Interest: ${stakeholder.interest_level || 'unset'}`}
            >
              P:{powerLevel} I:{interestLevel}
            </span>
          </div>
        </div>

        {/* Division Dropdown */}
        <div className="mt-2 ml-5.5" style={{ marginLeft: '22px' }}>
          <select
            value={stakeholder.division_id || ''}
            onChange={(e) => handleDivisionChange(stakeholder.stakeholder_id, e.target.value || undefined)}
            disabled={isUpdating}
            className="text-xs w-full px-2 py-1 rounded border bg-white disabled:opacity-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            <option value="">No division</option>
            {divisions.map(d => (
              <option key={d.division_id} value={d.division_id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4" style={{ color: 'var(--scout-sky)' }} />
          <h4 className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            Compass
          </h4>
        </div>
        <button
          onClick={handleAddStakeholder}
          className="text-xs px-2 py-1 rounded border hover:bg-gray-50 transition-colors flex items-center gap-1"
          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
        >
          <Plus className="w-3 h-3" />
          <span>Add</span>
        </button>
      </div>

      {/* Stakeholder List */}
      {confirmedStakeholders.length === 0 ? (
        <div
          className="text-center py-6 text-sm"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          <Compass className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No stakeholders mapped yet</p>
          <button
            onClick={handleAddStakeholder}
            className="mt-2 text-xs font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add first stakeholder
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {confirmedStakeholders.map(renderStakeholderCard)}
        </div>
      )}

      {/* Stakeholder Drawer */}
      <StakeholderDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
        accountPlanId={accountId}
        stakeholder={selectedStakeholder}
        divisions={divisions}
      />
    </div>
  )
}
