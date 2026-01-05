'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

interface Division {
  division_id: string
  name: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  email?: string
  role_type?: string
  is_placeholder?: boolean
}

interface CompellingEvent {
  event: string
  date?: string
  impact?: 'high' | 'medium' | 'low'
}

interface BuyingSignal {
  signal: string
  type?: string
  strength?: 'strong' | 'moderate' | 'weak'
}

interface PipelinePlaceholder {
  placeholder_id: string
  name: string
  placeholder_type: string
  vertical?: string
  target_quarter?: string
  target_year?: number
  projected_value?: number
  status: string
}

interface Pursuit {
  pursuit_id: string
  account_plan_id?: string
  name: string
  thesis?: string
  estimated_value?: number
  business_unit_id?: string
  signal_ids?: string[]
  pursuit_type?: string
  stage?: string
  pipeline_placeholder_id?: string
  created_at?: string
}

interface OpportunityDrawerProps {
  isOpen: boolean
  onClose: () => void
  pursuit: Pursuit | null
  accountPlanId: string
  divisions: Division[]
  stakeholders?: Stakeholder[]
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  onSave?: (updatedPursuit: Pursuit) => void
  onDelete?: (pursuitId: string) => void
  mode?: 'edit' | 'create'
}

const pursuitTypes = [
  { value: 'new_business', label: 'New Business', description: 'New customer or first sale' },
  { value: 'expansion', label: 'Expansion', description: 'Expand into new division or product' },
  { value: 'upsell', label: 'Upsell', description: 'Increase existing engagement' },
  { value: 'renewal', label: 'Renewal', description: 'Contract renewal opportunity' },
  { value: 'poc', label: 'POC/Pilot', description: 'Proof of concept or pilot project' },
]

const stages = [
  { value: 'identified', label: 'Identified', color: '#6b7280' },
  { value: 'researching', label: 'Researching', color: '#3b82f6' },
  { value: 'engaged', label: 'Engaged', color: '#8b5cf6' },
  { value: 'proposal', label: 'Proposal', color: '#f59e0b' },
  { value: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { value: 'closed_won', label: 'Closed Won', color: '#22c55e' },
  { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444' },
]

function formatCurrency(value: number | undefined): string {
  if (!value) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function OpportunityDrawer({
  isOpen,
  onClose,
  pursuit,
  accountPlanId,
  divisions,
  stakeholders = [],
  compellingEvents = [],
  buyingSignals = [],
  onSave,
  onDelete,
  mode = 'edit',
}: OpportunityDrawerProps) {
  const [formData, setFormData] = useState<Partial<Pursuit>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Stakeholder selection
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([])

  // Pipeline placeholders
  const [placeholders, setPlaceholders] = useState<PipelinePlaceholder[]>([])
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null)
  const [loadingPlaceholders, setLoadingPlaceholders] = useState(false)

  // Load pipeline placeholders
  useEffect(() => {
    if (isOpen) {
      loadPlaceholders()
    }
  }, [isOpen])

  const loadPlaceholders = async () => {
    setLoadingPlaceholders(true)
    try {
      const res = await fetch('/api/pipeline-placeholders?status=open')
      const data = await res.json()
      setPlaceholders(data.placeholders || [])
    } catch (err) {
      console.error('Failed to load placeholders:', err)
    } finally {
      setLoadingPlaceholders(false)
    }
  }

  // Load pursuit stakeholders if editing
  useEffect(() => {
    if (pursuit?.pursuit_id && isOpen) {
      loadPursuitStakeholders()
    }
  }, [pursuit?.pursuit_id, isOpen])

  const loadPursuitStakeholders = async () => {
    if (!pursuit?.pursuit_id) return
    try {
      const res = await fetch(`/api/pursuit-stakeholders?pursuit_id=${pursuit.pursuit_id}`)
      const data = await res.json()
      const ids = (data.stakeholders || []).map((s: { stakeholder_id: string }) => s.stakeholder_id)
      setSelectedStakeholders(ids)
    } catch (err) {
      console.error('Failed to load pursuit stakeholders:', err)
    }
  }

  useEffect(() => {
    if (pursuit) {
      setFormData({ ...pursuit })
      setSelectedPlaceholder(pursuit.pipeline_placeholder_id || null)
    } else {
      setFormData({
        pursuit_type: 'new_business',
      })
      setSelectedStakeholders([])
      setSelectedPlaceholder(null)
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [pursuit, isOpen])

  const handleChange = useCallback((field: keyof Pursuit, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }, [])

  const toggleStakeholder = useCallback((stakeholderId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }, [])

  const appendToThesis = useCallback((text: string) => {
    setFormData(prev => ({
      ...prev,
      thesis: prev.thesis ? `${prev.thesis}\n\n${text}` : text,
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.name?.trim()) {
      setError('Opportunity name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const isCreate = mode === 'create' || !pursuit?.pursuit_id

      // Save the pursuit
      const response = await fetch('/api/pursuits', {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isCreate ? { account_plan_id: accountPlanId } : { pursuit_id: pursuit!.pursuit_id }),
          name: formData.name,
          thesis: formData.thesis,
          estimated_value: formData.estimated_value,
          business_unit_id: formData.business_unit_id,
          pursuit_type: formData.pursuit_type,
          pipeline_placeholder_id: selectedPlaceholder,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to save')
      }

      const savedPursuit = result.pursuit

      // Save stakeholder associations
      if (savedPursuit?.pursuit_id) {
        // For simplicity, clear and re-add all stakeholder links
        // In production, you'd diff and only update changes
        for (const stakeholderId of selectedStakeholders) {
          await fetch('/api/pursuit-stakeholders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pursuit_id: savedPursuit.pursuit_id,
              stakeholder_id: stakeholderId,
            }),
          })
        }
      }

      // Update the pipeline placeholder if one was selected
      if (selectedPlaceholder) {
        await fetch('/api/pipeline-placeholders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeholder_id: selectedPlaceholder,
            status: 'filled',
            filled_by_pursuit_id: savedPursuit.pursuit_id,
          }),
        })
      }

      onSave?.(savedPursuit)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save opportunity')
    } finally {
      setSaving(false)
    }
  }, [pursuit, formData, accountPlanId, mode, selectedStakeholders, selectedPlaceholder, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!pursuit?.pursuit_id) return

    setSaving(true)
    try {
      const response = await fetch('/api/pursuits', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pursuit_id: pursuit.pursuit_id }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete opportunity')
      }

      onDelete?.(pursuit.pursuit_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [pursuit, onDelete, onClose])

  const isCreate = mode === 'create' || !pursuit?.pursuit_id
  const selectedType = pursuitTypes.find(t => t.value === formData.pursuit_type)
  const selectedStage = stages.find(s => s.value === formData.stage)

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? 'New Opportunity' : (formData.name || 'Opportunity')}
      subtitle={selectedType?.label}
      width="lg"
      footer={
        <div className="flex items-center justify-between">
          {!isCreate ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: '#dc2626' }}
              disabled={saving}
            >
              Delete Opportunity
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {saving ? 'Saving...' : isCreate ? 'Create Opportunity' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-4 p-4 rounded-lg border-2 border-red-200 bg-red-50">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete &quot;{pursuit?.name}&quot;?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm rounded border bg-white"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <DrawerSection title="Opportunity Details">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Opportunity Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., EVSec Platform - Diagnostics Division"
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Placeholder name until linked to Salesforce
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Opportunity Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pursuitTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleChange('pursuit_type', type.value)}
                  className={`p-2 text-left rounded-lg border transition-colors ${
                    formData.pursuit_type === type.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{type.label}</span>
                  <span className="text-xs text-gray-500">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Estimated Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  value={formData.estimated_value || ''}
                  onChange={(e) => handleChange('estimated_value', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--scout-border)' }}
                  placeholder="100000"
                />
              </div>
              {formData.estimated_value && (
                <p className="mt-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {formatCurrency(formData.estimated_value)}
                </p>
              )}
            </div>

            {divisions.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                  Target Division
                </label>
                <select
                  value={formData.business_unit_id || ''}
                  onChange={(e) => handleChange('business_unit_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <option value="">Enterprise-wide</option>
                  {divisions.map(div => (
                    <option key={div.division_id} value={div.division_id}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </DrawerSection>

      {/* Pipeline Placeholder Association */}
      <DrawerSection title="Pipeline Slot">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Link this opportunity to fill a pipeline placeholder:
          </p>

          {loadingPlaceholders ? (
            <p className="text-sm text-gray-500">Loading pipeline slots...</p>
          ) : placeholders.length === 0 ? (
            <p className="text-sm text-gray-500">No open pipeline slots available</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="placeholder"
                  checked={selectedPlaceholder === null}
                  onChange={() => setSelectedPlaceholder(null)}
                  className="w-4 h-4"
                />
                <span className="text-sm">No pipeline slot (standalone opportunity)</span>
              </label>

              {placeholders.map(ph => (
                <label
                  key={ph.placeholder_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPlaceholder === ph.placeholder_id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="placeholder"
                    checked={selectedPlaceholder === ph.placeholder_id}
                    onChange={() => setSelectedPlaceholder(ph.placeholder_id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">{ph.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ph.vertical && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
                          {ph.vertical}
                        </span>
                      )}
                      {ph.target_quarter && ph.target_year && (
                        <span className="text-xs text-gray-500">
                          {ph.target_quarter} {ph.target_year}
                        </span>
                      )}
                      {ph.projected_value && (
                        <span className="text-xs text-gray-500">
                          {formatCurrency(ph.projected_value)}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </DrawerSection>

      {/* Stakeholder Association */}
      {stakeholders.length > 0 && (
        <DrawerSection title="Associated Stakeholders">
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Select stakeholders involved in this opportunity:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stakeholders.filter(s => !s.is_placeholder).map(s => (
                <label
                  key={s.stakeholder_id}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedStakeholders.includes(s.stakeholder_id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStakeholders.includes(s.stakeholder_id)}
                    onChange={() => toggleStakeholder(s.stakeholder_id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{s.full_name}</span>
                    {s.title && (
                      <span className="text-xs text-gray-500 block truncate">{s.title}</span>
                    )}
                  </div>
                  {s.role_type && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: s.role_type === 'Champion' ? 'rgba(93, 122, 93, 0.15)' :
                          s.role_type === 'Economic Buyer' ? 'rgba(74, 144, 164, 0.15)' :
                          'rgba(139, 69, 19, 0.15)',
                        color: s.role_type === 'Champion' ? 'var(--scout-trail)' :
                          s.role_type === 'Economic Buyer' ? 'var(--scout-sky)' :
                          'var(--scout-saddle)',
                      }}
                    >
                      {s.role_type}
                    </span>
                  )}
                </label>
              ))}
            </div>

            {selectedStakeholders.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--scout-trail)' }}>
                {selectedStakeholders.length} stakeholder{selectedStakeholders.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </DrawerSection>
      )}

      {/* Stage */}
      {!isCreate && (
        <DrawerSection title="Stage">
          <div className="flex flex-wrap gap-2">
            {stages.map(stage => (
              <button
                key={stage.value}
                onClick={() => handleChange('stage', stage.value)}
                className="px-3 py-1.5 text-xs rounded-full border transition-colors"
                style={{
                  borderColor: formData.stage === stage.value ? stage.color : '#e5e7eb',
                  backgroundColor: formData.stage === stage.value ? `${stage.color}15` : 'transparent',
                  color: formData.stage === stage.value ? stage.color : 'inherit',
                }}
              >
                {stage.label}
              </button>
            ))}
          </div>
          {selectedStage && (
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm"
              style={{ backgroundColor: `${selectedStage.color}15`, color: selectedStage.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedStage.color }}
              />
              {selectedStage.label}
            </div>
          )}
        </DrawerSection>
      )}

      {/* Thesis / Strategy with AI Signals */}
      <DrawerSection title="Opportunity Thesis">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Why should we pursue this opportunity? What problem are we solving?
          </p>

          {/* AI-discovered signals to add */}
          {(compellingEvents.length > 0 || buyingSignals.length > 0) && (
            <div
              className="p-3 rounded-lg border"
              style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
                Add from account intelligence:
              </p>

              {compellingEvents.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--scout-clay)' }}>
                    Compelling Events
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {compellingEvents.slice(0, 5).map((event, i) => (
                      <button
                        key={i}
                        onClick={() => appendToThesis(`Compelling Event: ${event.event}`)}
                        className="text-xs px-2 py-1 rounded border hover:bg-white transition-colors text-left"
                        style={{ borderColor: 'var(--scout-border)' }}
                        title="Click to add to thesis"
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                          style={{
                            backgroundColor: event.impact === 'high' ? 'var(--scout-clay)' :
                              event.impact === 'medium' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)'
                          }}
                        />
                        {event.event.length > 40 ? event.event.slice(0, 40) + '...' : event.event}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {buyingSignals.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--scout-trail)' }}>
                    Buying Signals
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {buyingSignals.slice(0, 5).map((signal, i) => (
                      <button
                        key={i}
                        onClick={() => appendToThesis(`Buying Signal: ${signal.signal}`)}
                        className="text-xs px-2 py-1 rounded border hover:bg-white transition-colors text-left"
                        style={{ borderColor: 'var(--scout-border)' }}
                        title="Click to add to thesis"
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                          style={{
                            backgroundColor: signal.strength === 'strong' ? 'var(--scout-trail)' :
                              signal.strength === 'moderate' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)'
                          }}
                        />
                        {signal.signal.length > 40 ? signal.signal.slice(0, 40) + '...' : signal.signal}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <textarea
            value={formData.thesis || ''}
            onChange={(e) => handleChange('thesis', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border min-h-[120px]"
            style={{ borderColor: 'var(--scout-border)' }}
            placeholder="Describe the opportunity thesis and value proposition..."
          />
        </div>
      </DrawerSection>

      {/* Metadata for existing opportunities */}
      {!isCreate && pursuit?.created_at && (
        <DrawerSection title="Details">
          <div className="text-xs space-y-1" style={{ color: 'var(--scout-earth-light)' }}>
            <p>Created: {new Date(pursuit.created_at).toLocaleDateString()}</p>
            {pursuit.pursuit_id && <p>ID: {pursuit.pursuit_id.slice(0, 8)}...</p>}
          </div>
        </DrawerSection>
      )}
    </AccountDrawer>
  )
}
