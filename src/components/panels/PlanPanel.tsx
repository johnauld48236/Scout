'use client'

import { useState } from 'react'

interface ActionItem {
  action_id: string
  title: string
  due_date: string
  status: string
  priority: string
  bucket: '30' | '60' | '90'
  slip_acknowledged?: boolean  // True if user acknowledged the slip
}

interface PlanPanelProps {
  accountPlanId: string
  actionItems: ActionItem[]
  onUpdate?: () => void
}

const BUCKET_CONFIG = [
  { value: '30', label: '30-Day Focus', description: 'Immediate priorities', color: 'var(--scout-trail)' },
  { value: '60', label: '60-Day Horizon', description: 'Near-term objectives', color: 'var(--scout-sky)' },
  { value: '90', label: '90-Day Planning', description: 'Strategic initiatives', color: 'var(--scout-sunset)' },
]

export function PlanPanel({ accountPlanId, actionItems, onUpdate }: PlanPanelProps) {
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ title: '', priority: 'medium' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ title: string; priority: string } | null>(null)

  const itemsByBucket = {
    '30': actionItems.filter(a => a.bucket === '30'),
    '60': actionItems.filter(a => a.bucket === '60'),
    '90': actionItems.filter(a => a.bucket === '90'),
  }

  const handleAddItem = async (bucket: '30' | '60' | '90') => {
    if (!newItem.title.trim()) return
    setSaving(true)
    try {
      // Calculate due date based on bucket
      const daysOut = parseInt(bucket)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + daysOut)

      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: newItem.title.trim(),
          priority: newItem.priority,
          bucket,
          due_date: dueDate.toISOString(),
          status: 'pending',
        }),
      })
      if (response.ok) {
        setNewItem({ title: '', priority: 'medium' })
        setIsAdding(null)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleComplete = async (item: ActionItem) => {
    try {
      await fetch(`/api/action-items/${item.action_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: item.status === 'completed' ? 'pending' : 'completed',
        }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const handleDeleteItem = async (actionId: string) => {
    if (!confirm('Delete this item?')) return
    try {
      await fetch(`/api/action-items/${actionId}`, { method: 'DELETE' })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleMoveBucket = async (item: ActionItem, newBucket: '30' | '60' | '90') => {
    try {
      const daysOut = parseInt(newBucket)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + daysOut)

      await fetch(`/api/action-items/${item.action_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: newBucket,
          due_date: dueDate.toISOString(),
          slip_acknowledged: false, // Reset slip when moving
        }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to move item:', error)
    }
  }

  const handleStartEdit = (item: ActionItem) => {
    setEditingId(item.action_id)
    setEditData({ title: item.title, priority: item.priority })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editData) return
    setSaving(true)
    try {
      await fetch(`/api/action-items/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title.trim(),
          priority: editData.priority,
        }),
      })
      setEditingId(null)
      setEditData(null)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleAcknowledgeSlip = async (item: ActionItem) => {
    try {
      // Move item to the next bucket and reset due date
      const currentBucket = parseInt(item.bucket)
      const newBucket = currentBucket < 90 ? (currentBucket + 30).toString() as '30' | '60' | '90' : '90'
      const daysOut = parseInt(newBucket)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + daysOut)

      await fetch(`/api/action-items/${item.action_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: newBucket,
          due_date: dueDate.toISOString(),
          slip_acknowledged: true,
        }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to acknowledge slip:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--scout-clay)'
      case 'medium': return 'var(--scout-sunset)'
      default: return 'var(--scout-earth-light)'
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
        Build your 30/60/90 day plan. Items automatically roll forward based on their bucket.
      </p>

      {/* Buckets */}
      <div className="space-y-4">
        {BUCKET_CONFIG.map(bucket => {
          const items = itemsByBucket[bucket.value as '30' | '60' | '90']
          const completedCount = items.filter(i => i.status === 'completed').length
          const overdueCount = items.filter(i => i.status !== 'completed' && isOverdue(i.due_date)).length

          return (
            <div
              key={bucket.value}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              {/* Bucket Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: `${bucket.color}10` }}
              >
                <div>
                  <h3 className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                    {bucket.label}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {bucket.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {overdueCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-50" style={{ color: 'var(--scout-clay)' }}>
                      {overdueCount} slipped
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {completedCount}/{items.length}
                  </span>
                  <button
                    onClick={() => setIsAdding(bucket.value)}
                    className="text-xs px-2 py-1 rounded border hover:bg-white"
                    style={{ borderColor: bucket.color, color: bucket.color }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Add Form */}
              {isAdding === bucket.value && (
                <div className="p-3 border-b" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      placeholder="Action item..."
                      className="flex-1 px-3 py-1.5 rounded border text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddItem(bucket.value as '30' | '60' | '90')
                        if (e.key === 'Escape') { setIsAdding(null); setNewItem({ title: '', priority: 'medium' }) }
                      }}
                    />
                    <select
                      value={newItem.priority}
                      onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                      className="px-2 py-1.5 rounded border text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <button
                      onClick={() => handleAddItem(bucket.value as '30' | '60' | '90')}
                      disabled={saving || !newItem.title.trim()}
                      className="px-3 py-1.5 text-sm rounded text-white disabled:opacity-50"
                      style={{ backgroundColor: bucket.color }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setIsAdding(null); setNewItem({ title: '', priority: 'medium' }) }}
                      className="px-2 py-1.5 text-sm rounded border"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Items - Fixed height with scroll */}
              <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                      No items in this bucket
                    </p>
                  </div>
                ) : (
                  items.map(item => {
                    const overdue = item.status !== 'completed' && isOverdue(item.due_date)
                    const isEditingThis = editingId === item.action_id

                    // Edit mode
                    if (isEditingThis && editData) {
                      return (
                        <div
                          key={item.action_id}
                          className="p-3"
                          style={{ backgroundColor: 'var(--scout-parchment)' }}
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editData.title}
                              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                              className="flex-1 px-2 py-1 rounded border text-sm"
                              style={{ borderColor: 'var(--scout-border)' }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit()
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                            />
                            <select
                              value={editData.priority}
                              onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                              className="px-2 py-1 rounded border text-sm"
                              style={{ borderColor: 'var(--scout-border)' }}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            <button
                              onClick={handleSaveEdit}
                              disabled={saving || !editData.title.trim()}
                              className="px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                              style={{ backgroundColor: 'var(--scout-trail)' }}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs rounded border"
                              style={{ borderColor: 'var(--scout-border)' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    }

                    // Normal display
                    return (
                      <div
                        key={item.action_id}
                        className="p-3 flex items-center gap-3 group hover:bg-gray-50"
                        style={{ backgroundColor: overdue && !item.slip_acknowledged ? 'rgba(169, 68, 66, 0.03)' : undefined }}
                      >
                        <button
                          onClick={() => handleToggleComplete(item)}
                          className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: item.status === 'completed' ? 'var(--scout-trail)' : 'var(--scout-border)',
                            backgroundColor: item.status === 'completed' ? 'var(--scout-trail)' : 'transparent',
                          }}
                        >
                          {item.status === 'completed' && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${item.status === 'completed' ? 'line-through' : ''}`}
                            style={{ color: item.status === 'completed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)' }}
                          >
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span
                              className="text-[10px] px-1 py-0.5 rounded"
                              style={{ backgroundColor: `${getPriorityColor(item.priority)}15`, color: getPriorityColor(item.priority) }}
                            >
                              {item.priority}
                            </span>
                            {overdue && !item.slip_acknowledged && (
                              <>
                                <span className="text-[10px] px-1 py-0.5 rounded bg-red-50" style={{ color: 'var(--scout-clay)' }}>
                                  Slipped
                                </span>
                                <button
                                  onClick={() => handleAcknowledgeSlip(item)}
                                  className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-gray-100"
                                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                                >
                                  Accept Slip →
                                </button>
                              </>
                            )}
                            {item.slip_acknowledged && (
                              <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}>
                                Rolled forward
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-gray-100"
                            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                          >
                            Edit
                          </button>
                          <select
                            value={bucket.value}
                            onChange={(e) => handleMoveBucket(item, e.target.value as '30' | '60' | '90')}
                            className="text-[10px] px-1 py-0.5 rounded border"
                            style={{ borderColor: 'var(--scout-border)' }}
                          >
                            {BUCKET_CONFIG.map(b => (
                              <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteItem(item.action_id)}
                            className="text-xs px-1.5 py-0.5 rounded hover:bg-red-50"
                            style={{ color: 'var(--scout-clay)' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Plan Builder */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'rgba(56, 152, 199, 0.05)', borderColor: 'var(--scout-sky)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
              AI Plan Builder
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Let AI suggest action items based on your territory intelligence and active trails.
            </p>
            <button
              className="mt-2 text-sm px-3 py-1.5 rounded border hover:bg-white/50"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
            >
              Build Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
