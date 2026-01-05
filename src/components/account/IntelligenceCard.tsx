'use client'

import { useState, useCallback } from 'react'
import { SignalDrawer } from '@/components/drawers/SignalDrawer'

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

interface IntelligenceCardProps {
  accountPlanId: string
  accountThesis?: string
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  onRefresh?: () => void
}

export function IntelligenceCard({
  accountPlanId,
  accountThesis: initialThesis,
  compellingEvents: initialEvents,
  buyingSignals: initialSignals,
  onRefresh,
}: IntelligenceCardProps) {
  const [accountThesis, setAccountThesis] = useState(initialThesis || '')
  const [compellingEvents, setCompellingEvents] = useState<CompellingEvent[]>(initialEvents || [])
  const [buyingSignals, setBuyingSignals] = useState<BuyingSignal[]>(initialSignals || [])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSave = useCallback((data: {
    account_thesis?: string
    compelling_events?: CompellingEvent[]
    buying_signals?: BuyingSignal[]
  }) => {
    if (data.account_thesis !== undefined) setAccountThesis(data.account_thesis)
    if (data.compelling_events) setCompellingEvents(data.compelling_events)
    if (data.buying_signals) setBuyingSignals(data.buying_signals)
  }, [])

  const hasContent = accountThesis || compellingEvents.length > 0 || buyingSignals.length > 0
  const highImpactEvents = compellingEvents.filter(e => e.impact === 'high')
  const strongSignals = buyingSignals.filter(s => s.strength === 'strong')

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Account Intelligence
          </h3>
          {hasContent && (
            <div className="flex items-center gap-1">
              {compellingEvents.length > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[10px] rounded-full"
                  style={{
                    backgroundColor: highImpactEvents.length > 0 ? 'rgba(169, 68, 66, 0.15)' : 'var(--scout-border)',
                    color: highImpactEvents.length > 0 ? 'var(--scout-clay)' : 'var(--scout-earth-light)'
                  }}
                >
                  {compellingEvents.length} events
                </span>
              )}
              {buyingSignals.length > 0 && (
                <span
                  className="px-1.5 py-0.5 text-[10px] rounded-full"
                  style={{
                    backgroundColor: strongSignals.length > 0 ? 'rgba(93, 122, 93, 0.15)' : 'var(--scout-border)',
                    color: strongSignals.length > 0 ? 'var(--scout-trail)' : 'var(--scout-earth-light)'
                  }}
                >
                  {buyingSignals.length} signals
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-100 transition-colors"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* Account Thesis */}
          {accountThesis ? (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                ACCOUNT THESIS
              </p>
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                {accountThesis.length > 200 ? accountThesis.slice(0, 200) + '...' : accountThesis}
              </p>
            </div>
          ) : null}

          {/* Compelling Events */}
          {compellingEvents.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                COMPELLING EVENTS
              </p>
              <div className="space-y-1.5">
                {compellingEvents.slice(0, 3).map((event, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        backgroundColor: event.impact === 'high' ? 'var(--scout-clay)' :
                          event.impact === 'medium' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)'
                      }}
                    />
                    <span style={{ color: 'var(--scout-earth)' }}>
                      {event.event}
                    </span>
                  </div>
                ))}
                {compellingEvents.length > 3 && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-xs"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    +{compellingEvents.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Buying Signals */}
          {buyingSignals.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                BUYING SIGNALS
              </p>
              <div className="space-y-1.5">
                {buyingSignals.slice(0, 3).map((signal, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        backgroundColor: signal.strength === 'strong' ? 'var(--scout-trail)' :
                          signal.strength === 'moderate' ? 'var(--scout-sunset)' : 'var(--scout-earth-light)'
                      }}
                    />
                    <span style={{ color: 'var(--scout-earth)' }}>
                      {signal.signal}
                    </span>
                  </div>
                ))}
                {buyingSignals.length > 3 && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-xs"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    +{buyingSignals.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasContent && (
            <div
              className="p-4 rounded-lg border border-dashed text-center"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                No intelligence captured yet.
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
              >
                Add account thesis & signals
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signal Drawer */}
      <SignalDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        accountPlanId={accountPlanId}
        accountThesis={accountThesis}
        compellingEvents={compellingEvents}
        buyingSignals={buyingSignals}
        onSave={handleSave}
        onRefresh={onRefresh}
      />
    </div>
  )
}
