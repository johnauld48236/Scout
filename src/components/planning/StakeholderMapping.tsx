'use client'

import { useState, DragEvent } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { Account, Stakeholder, BusinessUnit } from './PlanningContainer'

interface StakeholderMappingProps {
  account: Account
  stakeholders: Stakeholder[]
  updateStakeholders: (stakeholders: Stakeholder[]) => void
  onNext: () => void
  onPrev: () => void
}

const ROLE_TYPES = [
  { value: 'Economic_Buyer', label: 'Economic Buyer', bantDimension: 'B' },
  { value: 'Technical_Buyer', label: 'Technical Buyer', bantDimension: 'A' },
  { value: 'Champion', label: 'Champion', bantDimension: 'N' },
  { value: 'Influencer', label: 'Influencer', bantDimension: 'A' },
  { value: 'End_User', label: 'End User', bantDimension: 'N' },
  { value: 'Blocker', label: 'Blocker', bantDimension: null },
  { value: 'Coach', label: 'Coach', bantDimension: null },
  { value: 'Project_Sponsor', label: 'Project Sponsor', bantDimension: 'T' },
  { value: 'Unknown', label: 'Unknown', bantDimension: null },
]

const SENTIMENTS = [
  { value: 'Strong_Advocate', label: 'Strong Advocate', color: 'bg-green-500' },
  { value: 'Supportive', label: 'Supportive', color: 'bg-green-400' },
  { value: 'Neutral', label: 'Neutral', color: 'bg-zinc-400' },
  { value: 'Skeptical', label: 'Skeptical', color: 'bg-orange-400' },
  { value: 'Opponent', label: 'Opponent', color: 'bg-red-500' },
  { value: 'Unknown', label: 'Unknown', color: 'bg-zinc-300' },
]

export function StakeholderMapping({
  account,
  stakeholders,
  updateStakeholders,
  onNext,
  onPrev,
}: StakeholderMappingProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAddPlaceholder, setShowAddPlaceholder] = useState(false)
  const [placeholderData, setPlaceholderData] = useState({ role: '', unit: '' })
  const [draggedStakeholder, setDraggedStakeholder] = useState<string | null>(null)
  const [dropTargetUnit, setDropTargetUnit] = useState<string | null>(null)
  const [editingStakeholder, setEditingStakeholder] = useState<string | null>(null)

  const businessUnits = account.business_units || []
  const businessUnitIds = new Set(businessUnits.map(u => u.id))

  // Separate stakeholders into categories:
  // 1. Mapped to wizard units (business_unit matches a wizard unit ID)
  // 2. Has legacy business_unit (string that doesn't match wizard units) - needs remapping
  // 3. No business_unit at all - needs placement
  // 4. Placeholders

  const placeholders = stakeholders.filter(s => s.is_placeholder === true)
  const realContacts = stakeholders.filter(s => s.is_placeholder !== true)

  // Contacts mapped to wizard-defined units
  const mappedToWizardUnits = realContacts.filter(s =>
    s.business_unit && businessUnitIds.has(s.business_unit)
  )

  // Contacts with legacy business_unit strings (needs remapping)
  const legacyMappedContacts = realContacts.filter(s =>
    s.business_unit &&
    s.business_unit.trim() !== '' &&
    !businessUnitIds.has(s.business_unit)
  )

  // Contacts with no business_unit at all
  const unplacedStakeholders = realContacts.filter(s =>
    !s.business_unit || s.business_unit.trim() === ''
  )

  // All contacts needing placement (legacy + unplaced)
  const contactsNeedingPlacement = [...legacyMappedContacts, ...unplacedStakeholders]

  const getStakeholdersInUnit = (unitId: string) => {
    return stakeholders.filter(s => s.business_unit === unitId && s.is_placeholder !== true)
  }

  // BANT Gap Analysis
  const bantAnalysis = {
    B: {
      label: 'Budget',
      description: 'Economic Buyer',
      hasRole: stakeholders.some(s => s.role_type === 'Economic_Buyer' && !s.is_placeholder),
      placeholder: placeholders.some(s => s.role_type === 'Economic_Buyer' || s.placeholder_role?.toLowerCase().includes('economic')),
    },
    A: {
      label: 'Authority',
      description: 'Decision Makers',
      hasRole: stakeholders.some(s =>
        (s.role_type === 'Technical_Buyer' || s.role_type === 'Influencer') && !s.is_placeholder
      ),
      placeholder: placeholders.some(s =>
        s.role_type === 'Technical_Buyer' || s.role_type === 'Influencer' ||
        s.placeholder_role?.toLowerCase().includes('technical') ||
        s.placeholder_role?.toLowerCase().includes('decision')
      ),
    },
    N: {
      label: 'Need',
      description: 'Champion / Users',
      hasRole: stakeholders.some(s =>
        (s.role_type === 'Champion' || s.role_type === 'End_User') && !s.is_placeholder
      ),
      placeholder: placeholders.some(s =>
        s.role_type === 'Champion' || s.role_type === 'End_User' ||
        s.placeholder_role?.toLowerCase().includes('champion') ||
        s.placeholder_role?.toLowerCase().includes('user')
      ),
    },
    T: {
      label: 'Timeline',
      description: 'Project Sponsor',
      hasRole: stakeholders.some(s => s.role_type === 'Project_Sponsor' && !s.is_placeholder),
      placeholder: placeholders.some(s =>
        s.role_type === 'Project_Sponsor' ||
        s.placeholder_role?.toLowerCase().includes('sponsor') ||
        s.placeholder_role?.toLowerCase().includes('project')
      ),
    },
  }

  // Drag handlers
  const handleDragStart = (e: DragEvent, stakeholderId: string) => {
    setDraggedStakeholder(stakeholderId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedStakeholder(null)
    setDropTargetUnit(null)
  }

  const handleDragOver = (e: DragEvent, unitId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetUnit(unitId)
  }

  const handleDragLeave = () => {
    setDropTargetUnit(null)
  }

  const handleDrop = async (e: DragEvent, unitId: string) => {
    e.preventDefault()
    setDropTargetUnit(null)

    if (!draggedStakeholder) return

    await moveToUnit(draggedStakeholder, unitId)
    setDraggedStakeholder(null)
  }

  const moveToUnit = async (stakeholderId: string, unitId: string | null) => {
    // Update locally
    updateStakeholders(
      stakeholders.map(s =>
        s.stakeholder_id === stakeholderId
          ? { ...s, business_unit: unitId || undefined }
          : s
      )
    )

    // Persist to server
    try {
      await fetch('/api/stakeholders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: stakeholderId,
          business_unit: unitId,
        }),
      })
    } catch (error) {
      console.error('Failed to update stakeholder:', error)
    }
  }

  const updateStakeholderField = async (stakeholderId: string, field: string, value: string) => {
    // Update locally
    updateStakeholders(
      stakeholders.map(s =>
        s.stakeholder_id === stakeholderId
          ? { ...s, [field]: value }
          : s
      )
    )

    // Persist to server
    try {
      await fetch('/api/stakeholders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: stakeholderId,
          [field]: value,
        }),
      })
    } catch (error) {
      console.error('Failed to update stakeholder:', error)
    }
  }

  const addPlaceholder = async () => {
    if (!placeholderData.role.trim()) return

    const newPlaceholder: Stakeholder = {
      stakeholder_id: `placeholder-${Date.now()}`,
      account_plan_id: account.account_plan_id,
      full_name: `TBD - ${placeholderData.role}`,
      title: placeholderData.role,
      business_unit: placeholderData.unit || undefined,
      is_placeholder: true,
      placeholder_role: placeholderData.role,
      role_type: 'Unknown',
      sentiment: 'Unknown',
    }

    updateStakeholders([...stakeholders, newPlaceholder])
    setPlaceholderData({ role: '', unit: '' })
    setShowAddPlaceholder(false)

    // Persist to server
    try {
      await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: account.account_plan_id,
          full_name: newPlaceholder.full_name,
          title: newPlaceholder.title,
          business_unit: newPlaceholder.business_unit,
          is_placeholder: true,
          placeholder_role: newPlaceholder.placeholder_role,
          role_type: 'Unknown',
          sentiment: 'Unknown',
        }),
      })
    } catch (error) {
      console.error('Failed to add placeholder:', error)
    }
  }

  const analyzeGaps = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze stakeholder coverage for ${account.account_name} and identify gaps for BANT qualification.

Current stakeholders:
${stakeholders.map(s => `- ${s.full_name} (${s.title || 'Unknown title'}) - ${s.role_type || 'Unknown role'} in ${s.business_unit || 'Unassigned'}`).join('\n')}

Business units:
${businessUnits.map(u => `- ${u.name}: ${u.description || 'No description'}`).join('\n')}

For BANT qualification, we need:
- Budget (B): Economic Buyer who controls budget
- Authority (A): Technical Buyer, Decision Makers who evaluate
- Need (N): Champion who advocates, End Users with pain
- Timeline (T): Project Sponsor driving urgency

Identify 2-4 key roles we're missing. Format each gap as:
Gap: [Role title needed]
Unit: [Business unit name]
BANT: [B, A, N, or T]
Reason: [Why this role is important]`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        const gaps: Stakeholder[] = []

        const blocks = content.split(/(?=Gap:|^\d+\.)/m).filter((b: string) => b.trim())

        blocks.forEach((block: string, i: number) => {
          const roleMatch = block.match(/(?:Gap:|^\d+\.?\s*)([^\n]+)/i)
          const unitMatch = block.match(/Unit:\s*([^\n]+)/i)
          const bantMatch = block.match(/BANT:\s*([BANT])/i)

          if (roleMatch) {
            const role = roleMatch[1].replace(/^[-*\d.)\s]+/, '').trim()
            const unitName = unitMatch?.[1]?.trim()
            const bant = bantMatch?.[1]?.toUpperCase()
            const unit = businessUnits.find(u =>
              u.name.toLowerCase().includes(unitName?.toLowerCase() || '') ||
              unitName?.toLowerCase().includes(u.name.toLowerCase())
            )

            // Map BANT to role_type
            let roleType = 'Unknown'
            if (bant === 'B') roleType = 'Economic_Buyer'
            else if (bant === 'A') roleType = 'Technical_Buyer'
            else if (bant === 'N') roleType = 'Champion'
            else if (bant === 'T') roleType = 'Project_Sponsor'

            if (role.length > 2) {
              gaps.push({
                stakeholder_id: `placeholder-${Date.now()}-${i}`,
                account_plan_id: account.account_plan_id,
                full_name: `TBD - ${role}`,
                title: role,
                business_unit: unit?.id,
                is_placeholder: true,
                placeholder_role: role,
                role_type: roleType,
                sentiment: 'Unknown',
              })
            }
          }
        })

        if (gaps.length > 0) {
          // Save each gap to the database and get real IDs
          const savedGaps: Stakeholder[] = []
          for (const gap of gaps) {
            try {
              const res = await fetch('/api/stakeholders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  account_plan_id: gap.account_plan_id,
                  full_name: gap.full_name,
                  title: gap.title,
                  business_unit: gap.business_unit,
                  is_placeholder: true,
                  placeholder_role: gap.placeholder_role,
                  role_type: gap.role_type,
                  sentiment: gap.sentiment,
                }),
              })
              if (res.ok) {
                const data = await res.json()
                savedGaps.push(data.stakeholder)
              } else {
                // If save fails, still add to local state with temp ID
                savedGaps.push(gap)
              }
            } catch {
              savedGaps.push(gap)
            }
          }
          updateStakeholders([...stakeholders, ...savedGaps])
        }
      }
    } catch (error) {
      console.error('Failed to analyze gaps:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getRoleTypeBadgeStyle = (roleType?: string) => {
    switch (roleType) {
      case 'Champion':
        return { backgroundColor: 'rgba(93, 122, 93, 0.2)', color: '#4a7a4a' }
      case 'Economic_Buyer':
        return { backgroundColor: 'rgba(74, 144, 164, 0.2)', color: '#3a8094' }
      case 'Technical_Buyer':
        return { backgroundColor: 'rgba(139, 69, 19, 0.2)', color: '#7a3c11' }
      case 'Influencer':
        return { backgroundColor: 'rgba(210, 105, 30, 0.2)', color: '#b85a1a' }
      case 'Blocker':
        return { backgroundColor: 'rgba(169, 68, 66, 0.2)', color: '#a94442' }
      case 'End_User':
        return { backgroundColor: 'rgba(147, 112, 219, 0.2)', color: '#6b5b95' }
      case 'Project_Sponsor':
        return { backgroundColor: 'rgba(70, 130, 180, 0.2)', color: '#4682b4' }
      case 'Coach':
        return { backgroundColor: 'rgba(60, 179, 113, 0.2)', color: '#2e8b57' }
      default:
        return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
    }
  }

  const getSentimentDot = (sentiment?: string) => {
    const s = SENTIMENTS.find(x => x.value === sentiment)
    return s?.color || 'bg-zinc-300'
  }

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Stakeholder Mapping
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Drag contacts into business units and set their buying role. Identify gaps for BANT qualification.
        </p>
      </div>

      {/* BANT Coverage Summary */}
      <div
        className="mb-6 p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
          BANT Coverage
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(bantAnalysis).map(([key, data]) => (
            <div
              key={key}
              className="p-3 rounded-lg border text-center"
              style={{
                backgroundColor: data.hasRole
                  ? 'rgba(93, 122, 93, 0.1)'
                  : data.placeholder
                  ? 'rgba(210, 105, 30, 0.1)'
                  : 'rgba(169, 68, 66, 0.1)',
                borderColor: data.hasRole
                  ? 'rgba(93, 122, 93, 0.3)'
                  : data.placeholder
                  ? 'rgba(210, 105, 30, 0.3)'
                  : 'rgba(169, 68, 66, 0.3)',
              }}
            >
              <div className="text-2xl mb-1">
                {data.hasRole ? '✓' : data.placeholder ? '?' : '✗'}
              </div>
              <div
                className="text-sm font-bold"
                style={{
                  color: data.hasRole
                    ? 'var(--scout-trail)'
                    : data.placeholder
                    ? 'var(--scout-sunset)'
                    : 'var(--scout-clay)',
                }}
              >
                {key}: {data.label}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                {data.hasRole
                  ? 'Covered'
                  : data.placeholder
                  ? 'Placeholder'
                  : `Need ${data.description}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gap Analysis Button */}
      <button
        onClick={analyzeGaps}
        disabled={isAnalyzing}
        className="w-full mb-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
        style={{
          background: isAnalyzing
            ? 'var(--scout-earth-light)'
            : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
          boxShadow: isAnalyzing ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
        }}
      >
        {isAnalyzing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Scout AI analyzing BANT gaps...</span>
          </>
        ) : (
          <>
            <ScoutAIIcon size={22} className="text-white" />
            <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
              Scout AI: Identify BANT Gaps
            </span>
          </>
        )}
      </button>

      {/* Business Unit Columns */}
      {businessUnits.length === 0 ? (
        <div
          className="p-6 rounded-lg border border-dashed text-center mb-6"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            No business units defined yet.
          </p>
          <button
            onClick={onPrev}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--scout-sky)' }}
          >
            ← Go back to define business units
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {businessUnits.map(unit => {
            const unitStakeholders = getStakeholdersInUnit(unit.id)
            const isDropTarget = dropTargetUnit === unit.id

            return (
              <div
                key={unit.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isDropTarget ? 'border-solid' : 'border-solid'
                }`}
                style={{
                  backgroundColor: isDropTarget ? 'rgba(74, 144, 164, 0.1)' : 'var(--scout-parchment)',
                  borderColor: isDropTarget ? 'var(--scout-sky)' : 'var(--scout-border)',
                }}
                onDragOver={(e) => handleDragOver(e, unit.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, unit.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                    {unit.name}
                  </h4>
                  <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {unitStakeholders.length} contacts
                  </span>
                </div>

                {/* Stakeholders in unit */}
                <div className="space-y-2 min-h-[120px]">
                  {unitStakeholders.map(stakeholder => (
                    <StakeholderCard
                      key={stakeholder.stakeholder_id}
                      stakeholder={stakeholder}
                      isEditing={editingStakeholder === stakeholder.stakeholder_id}
                      onStartEdit={() => setEditingStakeholder(stakeholder.stakeholder_id)}
                      onStopEdit={() => setEditingStakeholder(null)}
                      onUpdateField={updateStakeholderField}
                      onRemoveFromUnit={() => moveToUnit(stakeholder.stakeholder_id, null)}
                      getRoleTypeBadgeStyle={getRoleTypeBadgeStyle}
                      getSentimentDot={getSentimentDot}
                      isDragging={draggedStakeholder === stakeholder.stakeholder_id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}

                  {unitStakeholders.length === 0 && (
                    <div
                      className={`h-24 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                        isDropTarget ? 'border-sky-400' : ''
                      }`}
                      style={{ borderColor: isDropTarget ? 'var(--scout-sky)' : 'var(--scout-border)' }}
                    >
                      <p className="text-xs text-center px-4" style={{ color: 'var(--scout-earth-light)' }}>
                        Drag contacts here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Contacts Needing Placement - Draggable Cards */}
      <div
        className="mb-6 p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
          Contacts to Map ({contactsNeedingPlacement.length})
          {contactsNeedingPlacement.length > 0 && (
            <span className="font-normal ml-2" style={{ color: 'var(--scout-earth-light)' }}>
              — drag to assign to a business unit
            </span>
          )}
        </h4>

        {contactsNeedingPlacement.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {contactsNeedingPlacement.map(stakeholder => (
              <StakeholderCard
                key={stakeholder.stakeholder_id}
                stakeholder={stakeholder}
                isEditing={editingStakeholder === stakeholder.stakeholder_id}
                onStartEdit={() => setEditingStakeholder(stakeholder.stakeholder_id)}
                onStopEdit={() => setEditingStakeholder(null)}
                onUpdateField={updateStakeholderField}
                getRoleTypeBadgeStyle={getRoleTypeBadgeStyle}
                getSentimentDot={getSentimentDot}
                isDragging={draggedStakeholder === stakeholder.stakeholder_id}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isUnassigned
                legacyUnit={stakeholder.business_unit && !businessUnitIds.has(stakeholder.business_unit) ? stakeholder.business_unit : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            All contacts have been mapped to business units.
          </p>
        )}
      </div>

      {/* Placeholders Section - Draggable placeholder roles */}
      {placeholders.length > 0 && (
        <div
          className="mb-6 p-4 rounded-lg border border-dashed"
          style={{ backgroundColor: 'rgba(210, 105, 30, 0.05)', borderColor: 'var(--scout-sunset)' }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-sunset)' }}>
            Placeholder Roles ({placeholders.length})
            <span className="font-normal ml-2" style={{ color: 'var(--scout-earth-light)' }}>
              — drag to assign to a business unit
            </span>
          </h4>
          <div className="flex flex-wrap gap-3">
            {placeholders.map(placeholder => (
              <StakeholderCard
                key={placeholder.stakeholder_id}
                stakeholder={placeholder}
                isEditing={editingStakeholder === placeholder.stakeholder_id}
                onStartEdit={() => setEditingStakeholder(placeholder.stakeholder_id)}
                onStopEdit={() => setEditingStakeholder(null)}
                onUpdateField={updateStakeholderField}
                getRoleTypeBadgeStyle={getRoleTypeBadgeStyle}
                getSentimentDot={getSentimentDot}
                isDragging={draggedStakeholder === placeholder.stakeholder_id}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                isUnassigned={!placeholder.business_unit || !businessUnitIds.has(placeholder.business_unit)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Placeholder */}
      <div className="mb-6">
        {showAddPlaceholder ? (
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
          >
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
              Add Placeholder Role
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={placeholderData.role}
                onChange={(e) => setPlaceholderData({ ...placeholderData, role: e.target.value })}
                placeholder="Role (e.g., VP Engineering)"
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
              <select
                value={placeholderData.unit}
                onChange={(e) => setPlaceholderData({ ...placeholderData, unit: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="">Business Unit (optional)</option>
                {businessUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={addPlaceholder}
                disabled={!placeholderData.role.trim()}
                className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Add Placeholder
              </button>
              <button
                onClick={() => setShowAddPlaceholder(false)}
                className="px-4 py-2 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddPlaceholder(true)}
            className="w-full py-3 border border-dashed rounded-lg text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
          >
            + Add Placeholder Role (for contacts you need to find)
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 pt-4 flex justify-between border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm font-medium transition-colors hover:underline"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          Continue to Opportunities →
        </button>
      </div>
    </div>
  )
}

// Stakeholder Card Component with inline editing
function StakeholderCard({
  stakeholder,
  isEditing,
  onStartEdit,
  onStopEdit,
  onUpdateField,
  onRemoveFromUnit,
  getRoleTypeBadgeStyle,
  getSentimentDot,
  isDragging,
  onDragStart,
  onDragEnd,
  isUnassigned,
  legacyUnit,
}: {
  stakeholder: Stakeholder
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdateField: (id: string, field: string, value: string) => void
  onRemoveFromUnit?: () => void
  getRoleTypeBadgeStyle: (role?: string) => { backgroundColor: string; color: string }
  getSentimentDot: (sentiment?: string) => string
  isDragging: boolean
  onDragStart: (e: DragEvent, id: string) => void
  onDragEnd: () => void
  isUnassigned?: boolean
  legacyUnit?: string
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, stakeholder.stakeholder_id)}
      onDragEnd={onDragEnd}
      className={`p-3 rounded-lg border bg-white dark:bg-zinc-900 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${stakeholder.is_placeholder ? 'border-dashed' : ''} ${isUnassigned ? 'w-fit' : ''}`}
      style={{
        borderColor: stakeholder.is_placeholder ? 'var(--scout-sunset)' : 'var(--scout-border)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Sentiment dot */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getSentimentDot(stakeholder.sentiment)}`} />
            <span className="font-medium text-sm truncate" style={{ color: 'var(--scout-earth)' }}>
              {stakeholder.full_name}
            </span>
          </div>
          {stakeholder.title && (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--scout-earth-light)' }}>
              {stakeholder.title}
            </p>
          )}
          {legacyUnit && (
            <p className="text-xs mt-0.5 truncate px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-block">
              was: {legacyUnit}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              isEditing ? onStopEdit() : onStartEdit()
            }}
            className="p-1 rounded hover:bg-gray-100"
            title="Edit role & sentiment"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--scout-earth-light)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          {onRemoveFromUnit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveFromUnit()
              }}
              className="p-1 rounded hover:bg-red-50"
              title="Remove from unit"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--scout-clay)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Role badge */}
      {stakeholder.role_type && stakeholder.role_type !== 'Unknown' && !isEditing && (
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full mt-2 font-medium"
          style={getRoleTypeBadgeStyle(stakeholder.role_type)}
        >
          {stakeholder.role_type.replace(/_/g, ' ')}
        </span>
      )}

      {/* Inline Edit Panel */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--scout-border)' }}>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Buying Role
            </label>
            <select
              value={stakeholder.role_type || 'Unknown'}
              onChange={(e) => onUpdateField(stakeholder.stakeholder_id, 'role_type', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              {ROLE_TYPES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label} {r.bantDimension ? `(${r.bantDimension})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Sentiment
            </label>
            <select
              value={stakeholder.sentiment || 'Unknown'}
              onChange={(e) => onUpdateField(stakeholder.stakeholder_id, 'sentiment', e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              {SENTIMENTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onStopEdit}
            className="text-xs font-medium w-full py-1 rounded"
            style={{ backgroundColor: 'var(--scout-trail)', color: 'white' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
