'use client'

import { useState, useEffect } from 'react'
import { SignalItem, Initiative, PRIORITY_CONFIG, TIME_WINDOWS, getDefaultDueDateForBucket } from './types'

interface ItemEditModalProps {
  isOpen: boolean
  onClose: () => void
  item: SignalItem | null
  initiatives: Initiative[]
  accountPlanId: string
  itemType: SignalItem['item_type']
  onSave: () => void
  onDelete?: () => void
}

const PRIORITIES = ['P1', 'P2', 'P3'] as const
const STATUSES = ['open', 'in_progress', 'completed', 'closed'] as const

export function ItemEditModal({
  isOpen,
  onClose,
  item,
  initiatives,
  accountPlanId,
  itemType,
  onSave,
  onDelete,
}: ItemEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!item?.id

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P2' as typeof PRIORITIES[number],
    status: 'open' as typeof STATUSES[number],
    due_date: '',
    allocation_type: 'window' as 'window' | 'initiative' | 'date',
    bucket: '30' as '30' | '60' | '90' | '',
    initiative_id: '',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        priority: (item.priority as typeof PRIORITIES[number]) || 'P2',
        status: (item.status as typeof STATUSES[number]) || 'open',
        due_date: item.due_date?.split('T')[0] || '',
        allocation_type: item.initiative_id ? 'initiative' : item.due_date ? 'date' : 'window',
        bucket: item.bucket || '30',
        initiative_id: item.initiative_id || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'P2',
        status: 'open',
        due_date: '',
        allocation_type: 'window',
        bucket: '30',
        initiative_id: '',
      })
    }
  }, [item])

  if (!isOpen) return null

  const getApiEndpoint = () => {
    switch (itemType) {
      case 'pain_point':
      case 'field_request':
        return `/api/accounts/${accountPlanId}/pain-points`
      case 'risk':
      case 'hazard':
        return `/api/accounts/${accountPlanId}/risks`
      case 'action_item':
      default:
        return '/api/action-items'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      let dueDate = formData.due_date
      let bucket = formData.bucket
      let initiativeId = formData.initiative_id || null

      // Handle allocation type
      if (formData.allocation_type === 'window') {
        dueDate = getDefaultDueDateForBucket(formData.bucket).toISOString().split('T')[0]
        initiativeId = null
      } else if (formData.allocation_type === 'initiative') {
        const initiative = initiatives.find(i => i.id === formData.initiative_id)
        if (initiative?.due_date) {
          dueDate = initiative.due_date.split('T')[0]
        }
        // Map initiative due date to bucket
        if (dueDate) {
          const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          bucket = days <= 7 ? '30' : days <= 14 ? '60' : days <= 30 ? '90' : ''
        }
      } else {
        // Date allocation
        if (dueDate) {
          const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          bucket = days <= 7 ? '30' : days <= 14 ? '60' : days <= 30 ? '90' : ''
        }
        initiativeId = null
      }

      const payload: Record<string, unknown> = {
        title: formData.title,
        priority: formData.priority,
        status: formData.status,
        due_date: dueDate || null,
        bucket,
        initiative_id: initiativeId,
      }
      // Only include description if it has a value (avoid sending null to API)
      if (formData.description) {
        payload.description = formData.description
      }

      if (!isEditing) {
        payload.account_plan_id = accountPlanId
      }

      const endpoint = isEditing ? `${getApiEndpoint()}/${item!.id}` : getApiEndpoint()
      const method = isEditing ? 'PATCH' : 'POST'

      console.log('[ItemEditModal] Save payload:', JSON.stringify(payload, null, 2))
      console.log('[ItemEditModal] Endpoint:', endpoint, 'Method:', method)

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[ItemEditModal] API Error:', response.status, errorData)
        throw new Error(errorData.error || 'Failed to save')
      }

      onSave()
      onClose()
    } catch (err) {
      console.error('[ItemEditModal] Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item?.id || !confirm('Delete this item?')) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`${getApiEndpoint()}/${item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDelete?.()
        onClose()
      }
    } catch (err) {
      setError('Failed to delete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = async () => {
    if (!item?.id) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`${getApiEndpoint()}/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (response.ok) {
        onSave()
        onClose()
      }
    } catch (err) {
      setError('Failed to close item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'pain_point': return 'Pain Point'
      case 'risk': return 'Risk'
      case 'field_request': return 'Field Request'
      case 'hazard': return 'Hazard'
      case 'distress_signal': return 'Distress Signal'
      default: return 'Action Item'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            {isEditing ? `Edit ${getItemTypeLabel()}` : `New ${getItemTypeLabel()}`}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Brief description of the item..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Additional context or details..."
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as typeof PRIORITIES[number] })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof STATUSES[number] })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation */}
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Allocate To
            </label>

            <div className="flex gap-2 mb-3">
              {(['window', 'date', 'initiative'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, allocation_type: type })}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    formData.allocation_type === type
                      ? 'text-white'
                      : ''
                  }`}
                  style={{
                    backgroundColor: formData.allocation_type === type ? 'var(--scout-trail)' : 'white',
                    borderColor: formData.allocation_type === type ? 'var(--scout-trail)' : 'var(--scout-border)',
                    color: formData.allocation_type === type ? 'white' : 'var(--scout-earth)',
                  }}
                >
                  {type === 'window' ? 'Time Window' : type === 'date' ? 'Specific Date' : 'Initiative'}
                </button>
              ))}
            </div>

            {formData.allocation_type === 'window' && (
              <select
                value={formData.bucket}
                onChange={(e) => setFormData({ ...formData, bucket: e.target.value as '30' | '60' | '90' | '' })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
              >
                {TIME_WINDOWS.map(w => (
                  <option key={w.key} value={w.bucket}>{w.label}</option>
                ))}
              </select>
            )}

            {formData.allocation_type === 'date' && (
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
              />
            )}

            {formData.allocation_type === 'initiative' && (
              <select
                value={formData.initiative_id}
                onChange={(e) => setFormData({ ...formData, initiative_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)', backgroundColor: 'white' }}
              >
                <option value="">Select initiative...</option>
                {initiatives.filter(i => i.status === 'active').map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <div>
              {isEditing && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting || formData.status === 'closed'}
                    className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                    style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                  >
                    Close Item
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-red-50"
                    style={{ color: 'var(--scout-clay)' }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title}
                className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
