'use client'

import { useState, useEffect } from 'react'
import { Initiative, INITIATIVE_COLORS, SignalItem } from './types'

// Helper to get the correct API endpoint for an item type
function getApiEndpoint(itemType: SignalItem['item_type'], itemId: string, accountPlanId: string): string {
  switch (itemType) {
    case 'pain_point':
    case 'field_request':
      return `/api/accounts/${accountPlanId}/pain-points/${itemId}`
    case 'risk':
    case 'hazard':
      return `/api/accounts/${accountPlanId}/risks/${itemId}`
    case 'action_item':
    default:
      return `/api/action-items/${itemId}`
  }
}

interface InitiativeModalProps {
  isOpen: boolean
  onClose: () => void
  initiative: Initiative | null
  childItems?: SignalItem[]
  accountPlanId: string
  onSave: () => void
  onDelete?: () => void
}

export function InitiativeModal({
  isOpen,
  onClose,
  initiative,
  childItems = [],
  accountPlanId,
  onSave,
  onDelete,
}: InitiativeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showItems, setShowItems] = useState(false)
  const isEditing = !!initiative?.id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'blue',
    due_date: '',
    status: 'active' as 'active' | 'completed' | 'archived',
  })

  useEffect(() => {
    if (initiative) {
      setFormData({
        name: initiative.name || '',
        description: initiative.description || '',
        color: initiative.color || 'blue',
        due_date: initiative.due_date?.split('T')[0] || '',
        status: initiative.status || 'active',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: 'blue',
        due_date: '',
        status: 'active',
      })
    }
  }, [initiative])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
        target_date: formData.due_date || null,
        status: formData.status,
      }

      const endpoint = isEditing
        ? `/api/accounts/${accountPlanId}/buckets/${initiative!.id}`
        : `/api/accounts/${accountPlanId}/buckets`
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      onSave()
      onClose()
    } catch (err) {
      setError('Failed to save initiative. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initiative?.id || !confirm('Delete this initiative? Items will be unassigned but not deleted.')) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/buckets/${initiative.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDelete?.()
        onClose()
      }
    } catch (err) {
      setError('Failed to delete initiative')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseInitiative = async () => {
    if (!initiative?.id) return
    if (!confirm(`Close this initiative? This will also close all ${childItems.length} items in it.`)) return
    setIsSubmitting(true)

    try {
      // Close the initiative
      const response = await fetch(`/api/accounts/${accountPlanId}/buckets/${initiative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (response.ok) {
        // Close all child items using the correct API endpoint for each type
        for (const item of childItems) {
          const endpoint = getApiEndpoint(item.item_type, item.id, accountPlanId)
          await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'closed' }),
          })
        }
        onSave()
        onClose()
      }
    } catch (err) {
      setError('Failed to close initiative')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopenInitiative = async () => {
    if (!initiative?.id) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/buckets/${initiative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (response.ok) {
        onSave()
        onClose()
      }
    } catch (err) {
      setError('Failed to reopen initiative')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedColor = INITIATIVE_COLORS.find(c => c.value === formData.color) || INITIATIVE_COLORS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--scout-border)', backgroundColor: selectedColor.bg }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            {isEditing ? 'Edit Initiative' : 'New Initiative'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Initiative name..."
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
              placeholder="What is this initiative about?"
            />
          </div>

          {/* Color & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Color
              </label>
              <div className="flex gap-2">
                {INITIATIVE_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formData.color === c.value ? 'scale-110 ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: c.bg,
                      borderColor: c.border,
                      outlineColor: formData.color === c.value ? c.border : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Target Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>
          </div>

          {/* Child Items (if editing) */}
          {isEditing && childItems.length > 0 && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
              <button
                type="button"
                onClick={() => setShowItems(!showItems)}
                className="w-full flex items-center justify-between text-sm font-medium"
                style={{ color: 'var(--scout-saddle)' }}
              >
                <span>📁 Items ({childItems.length})</span>
                <span>{showItems ? '▼' : '▶'}</span>
              </button>
              {showItems && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {childItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-xs p-1 rounded"
                      style={{ backgroundColor: 'white' }}
                    >
                      <span>{item.status === 'closed' ? '✓' : '○'}</span>
                      <span
                        style={{
                          color: item.status === 'closed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)',
                          textDecoration: item.status === 'closed' ? 'line-through' : 'none',
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <div>
              {isEditing && (
                <div className="flex gap-2">
                  {initiative?.status === 'active' ? (
                    <button
                      type="button"
                      onClick={handleCloseInitiative}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                      style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                    >
                      Close Initiative
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReopenInitiative}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                      style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
                    >
                      Reopen
                    </button>
                  )}
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
                disabled={isSubmitting || !formData.name}
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
