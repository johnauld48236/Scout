'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

interface Mission {
  spark_id: string
  title: string
  description: string
  why_it_matters?: string
  health_impact: 'high' | 'medium' | 'low'
  status: string
  questions_to_explore: string[]
}

interface MissionDrawerProps {
  isOpen: boolean
  onClose: () => void
  mission: Mission | null
  accountPlanId: string
  onSave?: (updatedMission: Mission) => void
  onDelete?: (missionId: string) => void
  mode?: 'edit' | 'create'
}

const STATUS_OPTIONS = [
  { value: 'exploring', label: 'Planning', description: 'Defining approach' },
  { value: 'active', label: 'Active', description: 'Mission in progress' },
  { value: 'completed', label: 'Completed', description: 'Mission accomplished' },
  { value: 'closed', label: 'Closed', description: 'No longer pursuing' },
]

const HEALTH_IMPACT_OPTIONS = [
  { value: 'high', label: 'High', description: 'Critical to account health', color: 'var(--scout-clay)' },
  { value: 'medium', label: 'Medium', description: 'Important improvement', color: 'var(--scout-sunset)' },
  { value: 'low', label: 'Low', description: 'Nice to have', color: 'var(--scout-trail)' },
]

export function MissionDrawer({
  isOpen,
  onClose,
  mission,
  accountPlanId,
  onSave,
  onDelete,
  mode = 'edit',
}: MissionDrawerProps) {
  const [formData, setFormData] = useState<Partial<Mission>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')

  useEffect(() => {
    if (mission) {
      setFormData({ ...mission })
    } else {
      setFormData({
        title: '',
        description: '',
        why_it_matters: '',
        health_impact: 'medium',
        status: 'exploring',
        questions_to_explore: [],
      })
    }
    setError(null)
    setShowDeleteConfirm(false)
    setNewQuestion('')
  }, [mission, isOpen])

  const handleChange = useCallback((field: keyof Mission, value: string | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }, [])

  const addQuestion = useCallback(() => {
    if (!newQuestion.trim()) return
    setFormData(prev => ({
      ...prev,
      questions_to_explore: [...(prev.questions_to_explore || []), newQuestion.trim()],
    }))
    setNewQuestion('')
  }, [newQuestion])

  const removeQuestion = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      questions_to_explore: (prev.questions_to_explore || []).filter((_, i) => i !== index),
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.title?.trim()) {
      setError('Mission name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const isCreate = mode === 'create' || !mission?.spark_id

      const url = isCreate
        ? '/api/scout-themes'
        : `/api/scout-themes/${mission!.spark_id}`

      const body = isCreate
        ? {
            account_plan_id: accountPlanId,
            title: formData.title?.trim(),
            description: formData.description?.trim(),
            why_it_matters: formData.why_it_matters?.trim(),
            health_impact: formData.health_impact || 'medium',
            status: formData.status || 'exploring',
            questions_to_explore: formData.questions_to_explore || [],
            vector: 'in', // Missions are always Vector In
          }
        : {
            title: formData.title?.trim(),
            description: formData.description?.trim(),
            why_it_matters: formData.why_it_matters?.trim(),
            health_impact: formData.health_impact,
            status: formData.status,
            questions_to_explore: formData.questions_to_explore,
          }

      const response = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }

      onSave?.(result)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mission')
    } finally {
      setSaving(false)
    }
  }, [mission, formData, accountPlanId, mode, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!mission?.spark_id) return

    setSaving(true)
    try {
      const response = await fetch(`/api/scout-themes/${mission.spark_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete mission')
      }

      onDelete?.(mission.spark_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [mission, onDelete, onClose])

  const isCreate = mode === 'create' || !mission?.spark_id

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? 'Launch New Mission' : (formData.title || 'Edit Mission')}
      subtitle={isCreate ? 'Create a customer success initiative' : 'Update mission details'}
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
              Archive Mission
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
              style={{ backgroundColor: 'var(--scout-sky)' }}
            >
              {saving ? 'Saving...' : isCreate ? 'Launch Mission' : 'Save Changes'}
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
            Are you sure you want to archive &quot;{mission?.title}&quot;?
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
              {saving ? 'Archiving...' : 'Yes, Archive'}
            </button>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <DrawerSection title="Mission Details">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Mission Name *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., Q1 Stabilization, Training Rollout"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Objective
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[80px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="What is this mission trying to achieve? What problem does it solve?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Why It Matters
            </label>
            <textarea
              value={formData.why_it_matters || ''}
              onChange={(e) => handleChange('why_it_matters', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[60px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Why is this mission critical for the account?"
            />
          </div>
        </div>
      </DrawerSection>

      {/* Health Impact & Status */}
      <DrawerSection title="Impact & Status">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Health Impact
            </label>
            <div className="flex gap-2">
              {HEALTH_IMPACT_OPTIONS.map(impact => (
                <button
                  key={impact.value}
                  onClick={() => handleChange('health_impact', impact.value)}
                  className={`flex-1 p-3 rounded-lg border transition-colors ${
                    formData.health_impact === impact.value
                      ? 'ring-2 ring-offset-1'
                      : 'hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: formData.health_impact === impact.value ? impact.color : 'var(--scout-border)',
                    backgroundColor: formData.health_impact === impact.value ? `${impact.color}10` : 'transparent',
                  }}
                >
                  <span className="text-lg font-bold block" style={{ color: impact.color }}>
                    {impact.label}
                  </span>
                  <span className="text-xs block mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    {impact.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status.value}
                  onClick={() => handleChange('status', status.value)}
                  className={`p-2 text-left rounded-lg border transition-colors ${
                    formData.status === status.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{status.label}</span>
                  <span className="text-xs text-gray-500">{status.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DrawerSection>

      {/* Action Items */}
      <DrawerSection title="Action Items">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            What needs to be done to complete this mission?
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
              className="flex-1 px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Add an action item..."
            />
            <button
              onClick={addQuestion}
              className="px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Add
            </button>
          </div>

          {(formData.questions_to_explore?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {formData.questions_to_explore?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg group"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <span className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>•</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--scout-earth)' }}>
                    {item}
                  </span>
                  <button
                    onClick={() => removeQuestion(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                    style={{ color: 'var(--scout-clay)' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {(formData.questions_to_explore?.length ?? 0) === 0 && (
            <p className="text-xs text-gray-400 italic">No action items added yet</p>
          )}
        </div>
      </DrawerSection>
    </AccountDrawer>
  )
}
