'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

interface CompellingEvent {
  event: string
  date?: string
  source?: string
  impact?: 'high' | 'medium' | 'low'
}

interface BuyingSignal {
  signal: string
  type?: string
  date?: string
  source?: string
  strength?: 'strong' | 'moderate' | 'weak'
}

interface SignalData {
  account_thesis?: string
  compelling_events?: CompellingEvent[]
  buying_signals?: BuyingSignal[]
}

interface SignalDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  accountThesis?: string
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  onSave?: (data: SignalData) => void
  onRefresh?: () => void
}

const signalTypes = [
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'competitive', label: 'Competitive' },
  { value: 'technology', label: 'Technology' },
  { value: 'organizational', label: 'Organizational' },
  { value: 'financial', label: 'Financial' },
  { value: 'market', label: 'Market' },
]

const impactLevels = [
  { value: 'high', label: 'High Impact', color: '#dc2626' },
  { value: 'medium', label: 'Medium Impact', color: '#f59e0b' },
  { value: 'low', label: 'Low Impact', color: '#6b7280' },
]

const strengthLevels = [
  { value: 'strong', label: 'Strong', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', color: '#f59e0b' },
  { value: 'weak', label: 'Weak', color: '#6b7280' },
]

export function SignalDrawer({
  isOpen,
  onClose,
  accountPlanId,
  accountThesis: initialThesis,
  compellingEvents: initialEvents,
  buyingSignals: initialSignals,
  onSave,
  onRefresh,
}: SignalDrawerProps) {
  const [accountThesis, setAccountThesis] = useState(initialThesis || '')
  const [compellingEvents, setCompellingEvents] = useState<CompellingEvent[]>(initialEvents || [])
  const [buyingSignals, setBuyingSignals] = useState<BuyingSignal[]>(initialSignals || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'thesis' | 'events' | 'signals'>('thesis')

  // New item forms
  const [newEvent, setNewEvent] = useState<Partial<CompellingEvent>>({})
  const [newSignal, setNewSignal] = useState<Partial<BuyingSignal>>({})
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddSignal, setShowAddSignal] = useState(false)

  useEffect(() => {
    setAccountThesis(initialThesis || '')
    setCompellingEvents(initialEvents || [])
    setBuyingSignals(initialSignals || [])
    setError(null)
    setShowAddEvent(false)
    setShowAddSignal(false)
  }, [initialThesis, initialEvents, initialSignals, isOpen])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/accounts/${accountPlanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_thesis: accountThesis,
          compelling_events: compellingEvents,
          buying_signals: buyingSignals,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }

      onSave?.({
        account_thesis: accountThesis,
        compelling_events: compellingEvents,
        buying_signals: buyingSignals,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signals')
    } finally {
      setSaving(false)
    }
  }, [accountPlanId, accountThesis, compellingEvents, buyingSignals, onSave, onClose])

  const addEvent = useCallback(() => {
    if (!newEvent.event?.trim()) return
    setCompellingEvents(prev => [...prev, {
      event: newEvent.event!.trim(),
      date: newEvent.date,
      source: newEvent.source,
      impact: newEvent.impact || 'medium',
    }])
    setNewEvent({})
    setShowAddEvent(false)
  }, [newEvent])

  const removeEvent = useCallback((index: number) => {
    setCompellingEvents(prev => prev.filter((_, i) => i !== index))
  }, [])

  const addSignal = useCallback(() => {
    if (!newSignal.signal?.trim()) return
    setBuyingSignals(prev => [...prev, {
      signal: newSignal.signal!.trim(),
      type: newSignal.type,
      date: newSignal.date,
      source: newSignal.source,
      strength: newSignal.strength || 'moderate',
    }])
    setNewSignal({})
    setShowAddSignal(false)
  }, [newSignal])

  const removeSignal = useCallback((index: number) => {
    setBuyingSignals(prev => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Account Intelligence"
      subtitle="Thesis, events, and buying signals"
      width="xl"
      footer={
        <div className="flex items-center justify-between">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-amber-50"
              style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update with Scout AI
            </button>
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
              {saving ? 'Saving...' : 'Save Changes'}
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

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
        {[
          { id: 'thesis', label: 'Account Thesis' },
          { id: 'events', label: `Compelling Events (${compellingEvents.length})` },
          { id: 'signals', label: `Buying Signals (${buyingSignals.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'thesis' | 'events' | 'signals')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white shadow-sm font-medium'
                : 'hover:bg-white/50'
            }`}
            style={{ color: activeTab === tab.id ? 'var(--scout-saddle)' : 'var(--scout-earth)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Thesis Tab */}
      {activeTab === 'thesis' && (
        <DrawerSection title="Account Thesis">
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              The strategic rationale for pursuing this account. What makes them a fit? What&apos;s the opportunity?
            </p>
            <textarea
              value={accountThesis}
              onChange={(e) => setAccountThesis(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[200px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Why is this account a strategic fit? What pain points can we address? What's the potential value?"
            />
          </div>
        </DrawerSection>
      )}

      {/* Compelling Events Tab */}
      {activeTab === 'events' && (
        <DrawerSection
          title="Compelling Events"
          action={
            !showAddEvent && (
              <button
                onClick={() => setShowAddEvent(true)}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
              >
                + Add Event
              </button>
            )
          }
        >
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Time-sensitive events that create urgency or opportunity (regulatory deadlines, leadership changes, etc.)
            </p>

            {showAddEvent && (
              <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
                <input
                  type="text"
                  value={newEvent.event || ''}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, event: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--scout-border)' }}
                  placeholder="Describe the compelling event..."
                  autoFocus
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={newEvent.date || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                  <input
                    type="text"
                    value={newEvent.source || ''}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, source: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                    placeholder="Source"
                  />
                  <select
                    value={newEvent.impact || 'medium'}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, impact: e.target.value as 'high' | 'medium' | 'low' }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    {impactLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddEvent(false); setNewEvent({}) }}
                    className="px-3 py-1.5 text-sm rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addEvent}
                    className="px-3 py-1.5 text-sm rounded text-white"
                    style={{ backgroundColor: 'var(--scout-saddle)' }}
                    disabled={!newEvent.event?.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {compellingEvents.length === 0 && !showAddEvent && (
              <p className="text-sm text-gray-400 italic py-4 text-center">
                No compelling events tracked yet
              </p>
            )}

            {compellingEvents.map((event, index) => {
              const impact = impactLevels.find(i => i.value === event.impact)
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border group relative"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <button
                    onClick={() => removeEvent(index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-sm pr-6" style={{ color: 'var(--scout-earth)' }}>{event.event}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {event.date && (
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    )}
                    {event.source && (
                      <span>Source: {event.source}</span>
                    )}
                    {impact && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${impact.color}15`, color: impact.color }}
                      >
                        {impact.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DrawerSection>
      )}

      {/* Buying Signals Tab */}
      {activeTab === 'signals' && (
        <DrawerSection
          title="Buying Signals"
          action={
            !showAddSignal && (
              <button
                onClick={() => setShowAddSignal(true)}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
              >
                + Add Signal
              </button>
            )
          }
        >
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Indicators that the account may be ready to buy (hiring patterns, technology investments, etc.)
            </p>

            {showAddSignal && (
              <div className="p-3 rounded-lg border space-y-3" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
                <input
                  type="text"
                  value={newSignal.signal || ''}
                  onChange={(e) => setNewSignal(prev => ({ ...prev, signal: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border"
                  style={{ borderColor: 'var(--scout-border)' }}
                  placeholder="Describe the buying signal..."
                  autoFocus
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newSignal.type || ''}
                    onChange={(e) => setNewSignal(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="">Type...</option>
                    {signalTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newSignal.source || ''}
                    onChange={(e) => setNewSignal(prev => ({ ...prev, source: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                    placeholder="Source"
                  />
                  <select
                    value={newSignal.strength || 'moderate'}
                    onChange={(e) => setNewSignal(prev => ({ ...prev, strength: e.target.value as 'strong' | 'moderate' | 'weak' }))}
                    className="px-3 py-2 text-sm rounded-lg border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    {strengthLevels.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddSignal(false); setNewSignal({}) }}
                    className="px-3 py-1.5 text-sm rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSignal}
                    className="px-3 py-1.5 text-sm rounded text-white"
                    style={{ backgroundColor: 'var(--scout-saddle)' }}
                    disabled={!newSignal.signal?.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {buyingSignals.length === 0 && !showAddSignal && (
              <p className="text-sm text-gray-400 italic py-4 text-center">
                No buying signals tracked yet
              </p>
            )}

            {buyingSignals.map((signal, index) => {
              const strength = strengthLevels.find(s => s.value === signal.strength)
              const type = signalTypes.find(t => t.value === signal.type)
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg border group relative"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <button
                    onClick={() => removeSignal(index)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 transition-opacity"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-sm pr-6" style={{ color: 'var(--scout-earth)' }}>{signal.signal}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {type && (
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                        {type.label}
                      </span>
                    )}
                    {signal.source && (
                      <span>Source: {signal.source}</span>
                    )}
                    {strength && (
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${strength.color}15`, color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DrawerSection>
      )}
    </AccountDrawer>
  )
}
