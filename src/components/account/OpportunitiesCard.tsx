'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { OpportunityCardWrapper } from './OpportunityCardWrapper'
import { OpportunityDrawer } from '@/components/drawers/OpportunityDrawer'

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
  analysis_date?: string
}

interface Division {
  division_id: string
  name: string
}

interface Pursuit {
  pursuit_id: string
  account_plan_id?: string
  name: string
  description?: string
  thesis?: string
  estimated_value?: number
  stage?: string
  probability?: number
  target_close_date?: string
  notes?: string
  pursuit_type?: string
  deal_owner?: string
  deal_type?: string
  target_quarter?: string
  business_unit_id?: string
  engagement_plan?: string
  created_at?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  role_type?: string
  sentiment?: string
}

interface Action {
  action_id: string
  title: string
  status?: string
  due_date?: string
  pursuit_id?: string
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

interface OpportunitiesCardProps {
  pursuits: Pursuit[]
  stakeholders: Stakeholder[]
  actionItems: Action[]
  bantByPursuit: Map<string, BANTScore>
  accountId: string
  divisions?: Division[]
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function OpportunitiesCard({
  pursuits: initialPursuits,
  stakeholders,
  actionItems,
  bantByPursuit,
  accountId,
  divisions = [],
  compellingEvents = [],
  buyingSignals = [],
}: OpportunitiesCardProps) {
  const [showRecurring, setShowRecurring] = useState(false)
  const [pursuits, setPursuits] = useState(initialPursuits)
  const [selectedPursuit, setSelectedPursuit] = useState<Pursuit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit')

  const handlePursuitClick = useCallback((pursuit: Pursuit) => {
    setSelectedPursuit(pursuit)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }, [])

  const handleAddNew = useCallback(() => {
    setSelectedPursuit(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }, [])

  const handlePursuitSave = useCallback((updated: Pursuit) => {
    setPursuits(prev => {
      const exists = prev.some(p => p.pursuit_id === updated.pursuit_id)
      if (exists) {
        return prev.map(p => p.pursuit_id === updated.pursuit_id ? updated : p)
      }
      return [...prev, updated]
    })
  }, [])

  const handlePursuitDelete = useCallback((id: string) => {
    setPursuits(prev => prev.filter(p => p.pursuit_id !== id))
  }, [])

  // Separate pursuits by type
  const isRecurringType = (type?: string) =>
    type === 'recurring' || type === 'renewal'

  const activePursuits = pursuits.filter(p => !isRecurringType(p.pursuit_type))
  const recurringPursuits = pursuits.filter(p => isRecurringType(p.pursuit_type))

  // Calculate recurring revenue total
  const recurringTotal = recurringPursuits.reduce((sum, p) => {
    const value = typeof p.estimated_value === 'string'
      ? parseFloat(p.estimated_value)
      : (p.estimated_value || 0)
    return sum + (isNaN(value) ? 0 : value)
  }, 0)

  // Sort function for pursuits
  const sortPursuits = (a: Pursuit, b: Pursuit) => {
    const stageOrder = ['Closed Won', 'Closed_Won', 'Negotiation', 'Proposal', 'Demo', 'Qualification', 'Discovery']
    const aIndex = stageOrder.indexOf(a.stage || 'Discovery')
    const bIndex = stageOrder.indexOf(b.stage || 'Discovery')
    if (aIndex !== bIndex) return aIndex - bIndex
    const aValue = typeof a.estimated_value === 'string' ? parseFloat(a.estimated_value) : (a.estimated_value || 0)
    const bValue = typeof b.estimated_value === 'string' ? parseFloat(b.estimated_value) : (b.estimated_value || 0)
    return bValue - aValue
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold text-sm"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Opportunities ({pursuits.length})
        </h3>
        <button
          onClick={handleAddNew}
          className="text-xs hover:underline"
          style={{ color: 'var(--scout-sky)' }}
        >
          + Add
        </button>
      </div>

      {pursuits.length > 0 ? (
        <div className="space-y-2">
          {/* Active Opportunities - Always shown */}
          {activePursuits.sort(sortPursuits).map(pursuit => (
            <OpportunityCardWrapper
              key={pursuit.pursuit_id}
              pursuit={pursuit}
              stakeholders={stakeholders}
              actions={actionItems.filter(a => a.pursuit_id === pursuit.pursuit_id)}
              bantScore={bantByPursuit.get(pursuit.pursuit_id)}
              onEdit={() => handlePursuitClick(pursuit)}
            />
          ))}

          {/* Recurring Revenue Section - Collapsed by default */}
          {recurringPursuits.length > 0 && (
            <div
              className="mt-3 pt-3 border-t"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <button
                onClick={() => setShowRecurring(!showRecurring)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-3 h-3 transition-transform ${showRecurring ? 'rotate-90' : ''}`}
                    style={{ color: 'var(--scout-earth-light)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
                    Recurring Revenue
                  </span>
                  <span
                    className="px-1.5 py-0.5 text-[10px] rounded-full"
                    style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
                  >
                    {recurringPursuits.length}
                  </span>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>
                  {formatCurrency(recurringTotal)}
                </span>
              </button>

              {showRecurring && (
                <div className="mt-2 space-y-2">
                  {recurringPursuits.sort(sortPursuits).map(pursuit => (
                    <OpportunityCardWrapper
                      key={pursuit.pursuit_id}
                      pursuit={pursuit}
                      stakeholders={stakeholders}
                      actions={actionItems.filter(a => a.pursuit_id === pursuit.pursuit_id)}
                      bantScore={bantByPursuit.get(pursuit.pursuit_id)}
                      onEdit={() => handlePursuitClick(pursuit)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty active pursuits message */}
          {activePursuits.length === 0 && recurringPursuits.length > 0 && (
            <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
              Only recurring opportunities.{' '}
              <button onClick={handleAddNew} style={{ color: 'var(--scout-sky)' }}>
                Add new opportunity →
              </button>
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
          No opportunities yet.{' '}
          <button onClick={handleAddNew} style={{ color: 'var(--scout-sky)' }}>
            Add one →
          </button>
        </p>
      )}

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pursuit={selectedPursuit}
        accountPlanId={accountId}
        divisions={divisions}
        stakeholders={stakeholders}
        compellingEvents={compellingEvents}
        buyingSignals={buyingSignals}
        onSave={handlePursuitSave}
        onDelete={handlePursuitDelete}
        mode={drawerMode}
      />
    </div>
  )
}
