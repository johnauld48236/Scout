'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

interface Trail {
  spark_id: string
  title: string
  description: string
  why_it_matters?: string
  size: 'high' | 'medium' | 'low'
  status: string
  questions_to_explore: string[]
  linked_pursuit_id: string | null
  converted_to_pursuit_id: string | null
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage?: string
  estimated_value?: number
  crm_url?: string | null
}

interface TrailDrawerProps {
  isOpen: boolean
  onClose: () => void
  trail: Trail | null
  accountPlanId: string
  pursuits: Pursuit[]
  onSave?: (updatedTrail: Trail) => void
  onDelete?: (trailId: string) => void
  mode?: 'edit' | 'create'
}

const STATUS_OPTIONS = [
  { value: 'exploring', label: 'Scouting', description: 'Gathering intelligence' },
  { value: 'linked', label: 'Blazing', description: 'Linked to CRM deal' },
  { value: 'converted', label: 'Active', description: 'Converted to CRM deal' },
  { value: 'closed', label: 'Closed', description: 'No longer pursuing' },
]

const SIZE_OPTIONS = [
  { value: 'high', label: '$$$', description: 'High value opportunity', color: 'var(--scout-trail)' },
  { value: 'medium', label: '$$', description: 'Medium value opportunity', color: 'var(--scout-sky)' },
  { value: 'low', label: '$', description: 'Lower value opportunity', color: 'var(--scout-sunset)' },
]

export function TrailDrawer({
  isOpen,
  onClose,
  trail,
  accountPlanId,
  pursuits,
  onSave,
  onDelete,
  mode = 'edit',
}: TrailDrawerProps) {
  const [formData, setFormData] = useState<Partial<Trail>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')

  useEffect(() => {
    if (trail) {
      setFormData({ ...trail })
    } else {
      setFormData({
        title: '',
        description: '',
        why_it_matters: '',
        size: 'medium',
        status: 'exploring',
        questions_to_explore: [],
        linked_pursuit_id: null,
        converted_to_pursuit_id: null,
      })
    }
    setError(null)
    setShowDeleteConfirm(false)
    setNewQuestion('')
  }, [trail, isOpen])

  const handleChange = useCallback((field: keyof Trail, value: string | string[] | null) => {
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
      setError('Trail title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const isCreate = mode === 'create' || !trail?.spark_id

      const url = isCreate
        ? '/api/scout-themes'
        : `/api/scout-themes/${trail!.spark_id}`

      const body = isCreate
        ? {
            account_plan_id: accountPlanId,
            title: formData.title?.trim(),
            description: formData.description?.trim(),
            why_it_matters: formData.why_it_matters?.trim(),
            size: formData.size || 'medium',
            status: formData.status || 'exploring',
            questions_to_explore: formData.questions_to_explore || [],
            linked_pursuit_id: formData.linked_pursuit_id,
          }
        : {
            title: formData.title?.trim(),
            description: formData.description?.trim(),
            why_it_matters: formData.why_it_matters?.trim(),
            size: formData.size,
            status: formData.status,
            questions_to_explore: formData.questions_to_explore,
            linked_pursuit_id: formData.linked_pursuit_id,
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
      setError(err instanceof Error ? err.message : 'Failed to save trail')
    } finally {
      setSaving(false)
    }
  }, [trail, formData, accountPlanId, mode, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!trail?.spark_id) return

    setSaving(true)
    try {
      const response = await fetch(`/api/scout-themes/${trail.spark_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete trail')
      }

      onDelete?.(trail.spark_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [trail, onDelete, onClose])

  const handleLinkPursuit = useCallback(async (pursuitId: string | null) => {
    handleChange('linked_pursuit_id', pursuitId)
    if (pursuitId) {
      handleChange('status', 'linked')
    } else {
      handleChange('status', 'exploring')
    }
  }, [handleChange])

  const linkedPursuit = pursuits.find(p =>
    p.pursuit_id === formData.linked_pursuit_id || p.pursuit_id === formData.converted_to_pursuit_id
  )

  const isCreate = mode === 'create' || !trail?.spark_id

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? 'Blaze New Trail' : (formData.title || 'Edit Trail')}
      subtitle={isCreate ? 'Create an opportunity hypothesis' : 'Update trail details'}
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
              Archive Trail
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
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {saving ? 'Saving...' : isCreate ? 'Blaze Trail' : 'Save Changes'}
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
            Are you sure you want to archive &quot;{trail?.title}&quot;?
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
      <DrawerSection title="Trail Details">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Trail Name *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., Enterprise Security Platform Expansion"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Thesis
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[80px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="What's the opportunity hypothesis? Why does this trail have potential?"
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
              placeholder="Why is this opportunity important for them and us?"
            />
          </div>
        </div>
      </DrawerSection>

      {/* Size & Status */}
      <DrawerSection title="Opportunity Sizing">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Estimated Value
            </label>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map(size => (
                <button
                  key={size.value}
                  onClick={() => handleChange('size', size.value)}
                  className={`flex-1 p-3 rounded-lg border transition-colors ${
                    formData.size === size.value
                      ? 'ring-2 ring-offset-1'
                      : 'hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: formData.size === size.value ? size.color : 'var(--scout-border)',
                    backgroundColor: formData.size === size.value ? `${size.color}10` : 'transparent',
                  }}
                >
                  <span className="text-lg font-bold block" style={{ color: size.color }}>
                    {size.label}
                  </span>
                  <span className="text-xs block mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    {size.description}
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
                      ? 'border-amber-500 bg-amber-50'
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

      {/* CRM Link */}
      <DrawerSection title="CRM Connection">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Link this trail to an existing CRM deal to track the opportunity.
          </p>

          {linkedPursuit ? (
            <div
              className="p-3 rounded-lg border"
              style={{ borderColor: 'var(--scout-trail)', backgroundColor: 'rgba(93, 122, 93, 0.05)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                    {linkedPursuit.crm_url ? (
                      <a
                        href={linkedPursuit.crm_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-center gap-1"
                      >
                        <span>🔗</span> {linkedPursuit.name}
                      </a>
                    ) : (
                      <span>🔗 {linkedPursuit.name}</span>
                    )}
                  </span>
                  {linkedPursuit.stage && (
                    <span className="text-xs ml-2" style={{ color: 'var(--scout-earth-light)' }}>
                      ({linkedPursuit.stage})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleLinkPursuit(null)}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <select
              value={formData.linked_pursuit_id || ''}
              onChange={(e) => handleLinkPursuit(e.target.value || null)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <option value="">Select CRM deal to link...</option>
              {pursuits.map(p => (
                <option key={p.pursuit_id} value={p.pursuit_id}>
                  {p.name} {p.stage ? `(${p.stage})` : ''} {p.estimated_value ? `- $${p.estimated_value.toLocaleString()}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </DrawerSection>

      {/* Questions to Explore */}
      <DrawerSection title="Questions to Explore">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            What questions need to be answered to validate this trail?
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuestion())}
              className="flex-1 px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Add a question..."
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
              {formData.questions_to_explore?.map((question, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg group"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <span className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>•</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--scout-earth)' }}>
                    {question}
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
            <p className="text-xs text-gray-400 italic">No questions added yet</p>
          )}
        </div>
      </DrawerSection>
    </AccountDrawer>
  )
}
