'use client'

import { useState } from 'react'

interface Signal {
  signal_id: string
  title: string
  type: string
  description?: string
  source_url?: string
  date: string
}

interface SignalsPanelProps {
  accountPlanId: string
  signals: Signal[]
  onUpdate?: () => void
}

const SIGNAL_TYPES = [
  { value: 'buying_signal', label: 'Buying Signal', icon: '💼' },
  { value: 'regulatory', label: 'Regulatory', icon: '📈' },
  { value: 'leadership_change', label: 'Leadership Change', icon: '👤' },
  { value: 'funding', label: 'Funding', icon: '💰' },
  { value: 'expansion', label: 'Expansion', icon: '🌐' },
  { value: 'risk', label: 'Risk', icon: '🔔' },
  { value: 'other', label: 'Other', icon: '📌' },
]

export function SignalsPanel({ accountPlanId, signals, onUpdate }: SignalsPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newSignal, setNewSignal] = useState({ title: '', type: 'buying_signal', description: '', source_url: '' })
  const [saving, setSaving] = useState(false)

  const handleAddSignal = async () => {
    if (!newSignal.title.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSignal.title.trim(),
          type: newSignal.type,
          description: newSignal.description.trim() || null,
          source_url: newSignal.source_url.trim() || null,
        }),
      })
      if (response.ok) {
        setNewSignal({ title: '', type: 'buying_signal', description: '', source_url: '' })
        setIsAdding(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add signal:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Delete this signal?')) return
    try {
      await fetch(`/api/accounts/${accountPlanId}/signals/${signalId}`, { method: 'DELETE' })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete signal:', error)
    }
  }

  const getSignalIcon = (type: string) => {
    return SIGNAL_TYPES.find(t => t.value === type)?.icon || '📌'
  }

  const groupedSignals = SIGNAL_TYPES.map(type => ({
    ...type,
    signals: signals.filter(s => s.type === type.value),
  })).filter(group => group.signals.length > 0)

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
        Track market signals, news, and events that indicate buying intent or opportunity.
      </p>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
        >
          + Add Signal
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
        >
          <div className="space-y-3">
            <input
              type="text"
              value={newSignal.title}
              onChange={(e) => setNewSignal({ ...newSignal, title: e.target.value })}
              placeholder="Signal headline..."
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              autoFocus
            />
            <select
              value={newSignal.type}
              onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              {SIGNAL_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <textarea
              value={newSignal.description}
              onChange={(e) => setNewSignal({ ...newSignal, description: e.target.value })}
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              rows={2}
            />
            <input
              type="url"
              value={newSignal.source_url}
              onChange={(e) => setNewSignal({ ...newSignal, source_url: e.target.value })}
              placeholder="Source URL (optional)..."
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddSignal}
              disabled={saving || !newSignal.title.trim()}
              className="px-3 py-1 text-sm rounded text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {saving ? 'Saving...' : 'Add Signal'}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewSignal({ title: '', type: 'buying_signal', description: '', source_url: '' }) }}
              className="px-3 py-1 text-sm rounded border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Signals List */}
      {signals.length === 0 && !isAdding ? (
        <div
          className="p-8 rounded-lg border text-center"
          style={{ borderColor: 'var(--scout-border)', borderStyle: 'dashed' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            No signals gathered yet
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--scout-earth-light)' }}>
            Add signals manually or let AI discover them
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm px-4 py-2 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            + Add First Signal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSignals.map(group => (
            <div key={group.value}>
              <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                {group.icon} {group.label} ({group.signals.length})
              </h4>
              <div className="space-y-2">
                {group.signals.map(signal => (
                  <div
                    key={signal.signal_id}
                    className="p-3 rounded-lg border group"
                    style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span>{getSignalIcon(signal.type)}</span>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                            {signal.title}
                          </p>
                          {signal.description && (
                            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                              {signal.description}
                            </p>
                          )}
                          <p className="text-[10px] mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                            {new Date(signal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSignal(signal.signal_id)}
                        className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        style={{ color: 'var(--scout-clay)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Gather */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'rgba(56, 152, 199, 0.05)', borderColor: 'var(--scout-sky)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
              Gather Intelligence
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Let AI search for recent news, regulatory filings, and market signals.
            </p>
            <button
              className="mt-2 text-sm px-3 py-1.5 rounded border hover:bg-white/50"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
            >
              Gather Signals
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
