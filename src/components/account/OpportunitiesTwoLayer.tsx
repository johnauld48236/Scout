'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OpportunityCardWrapper } from './OpportunityCardWrapper'
import { OpportunityDrawer } from '@/components/drawers/OpportunityDrawer'
import { ExploreOpportunitiesChat } from './ExploreOpportunitiesChat'

interface ScoutTheme {
  theme_id: string
  title: string
  description?: string
  why_it_matters?: string
  size: 'high' | 'medium' | 'low'
  signals_connected?: string[]
  questions_to_explore?: string[]
  status: string
}

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
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
  pursuit_type?: string
  deal_owner?: string
  deal_type?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Action {
  action_id: string
  title: string
  status?: string
  pursuit_id?: string
}

interface Signal {
  signal_id: string
  summary: string
  title?: string
  signal_type?: string
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

interface OpportunitiesTwoLayerProps {
  accountPlanId: string
  accountName: string
  scoutThemes: ScoutTheme[]
  pursuits: Pursuit[]
  stakeholders: Stakeholder[]
  signals: Signal[]
  actionItems: Action[]
  bantByPursuit: Map<string, BANTScore>
  divisions?: Division[]
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  industry?: string
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getSizeDisplay(size: 'high' | 'medium' | 'low'): { label: string; color: string; bg: string } {
  switch (size) {
    case 'high':
      return { label: '$$$', color: 'var(--scout-trail)', bg: 'rgba(93, 122, 93, 0.15)' }
    case 'medium':
      return { label: '$$', color: 'var(--scout-sunset)', bg: 'rgba(210, 105, 30, 0.15)' }
    case 'low':
      return { label: '$', color: 'var(--scout-earth-light)', bg: 'var(--scout-parchment)' }
  }
}

export function OpportunitiesTwoLayer({
  accountPlanId,
  accountName,
  scoutThemes: initialThemes,
  pursuits: initialPursuits,
  stakeholders,
  signals,
  actionItems,
  bantByPursuit,
  divisions = [],
  compellingEvents = [],
  buyingSignals = [],
  industry,
}: OpportunitiesTwoLayerProps) {
  const router = useRouter()
  const [scoutThemes, setScoutThemes] = useState(initialThemes)
  const [pursuits, setPursuits] = useState(initialPursuits)
  const [selectedPursuit, setSelectedPursuit] = useState<Pursuit | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit')
  const [showExploreChat, setShowExploreChat] = useState(false)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)

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

  const handleThemeSaved = useCallback((theme: ScoutTheme) => {
    setScoutThemes(prev => {
      const exists = prev.some(t => t.theme_id === theme.theme_id)
      if (exists) {
        return prev.map(t => t.theme_id === theme.theme_id ? theme : t)
      }
      return [theme, ...prev]
    })
  }, [])

  const handleDismissTheme = useCallback(async (themeId: string) => {
    try {
      await fetch(`/api/scout-themes/${themeId}`, {
        method: 'DELETE',
      })
      setScoutThemes(prev => prev.filter(t => t.theme_id !== themeId))
    } catch (error) {
      console.error('Failed to dismiss theme:', error)
    }
  }, [])

  const handleConvertToOpportunity = useCallback(async (theme: ScoutTheme) => {
    try {
      // Create pursuit from theme
      const response = await fetch('/api/pursuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          name: theme.title,
          thesis: theme.description || theme.why_it_matters,
          stage: 'Discovery',
        }),
      })

      if (response.ok) {
        const newPursuit = await response.json()
        // Mark theme as converted
        await fetch(`/api/scout-themes/${theme.theme_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'converted',
            converted_to_pursuit_id: newPursuit.pursuit_id,
          }),
        })
        // Update local state
        setScoutThemes(prev => prev.filter(t => t.theme_id !== theme.theme_id))
        setPursuits(prev => [...prev, newPursuit])
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to convert theme:', error)
    }
  }, [accountPlanId, router])

  // Sort pursuits by stage
  const sortPursuits = (a: Pursuit, b: Pursuit) => {
    const stageOrder = ['Closed Won', 'Closed_Won', 'Negotiation', 'Proposal', 'Demo', 'Qualification', 'Discovery']
    const aIndex = stageOrder.indexOf(a.stage || 'Discovery')
    const bIndex = stageOrder.indexOf(b.stage || 'Discovery')
    if (aIndex !== bIndex) return aIndex - bIndex
    const aValue = typeof a.estimated_value === 'string' ? parseFloat(a.estimated_value) : (a.estimated_value || 0)
    const bValue = typeof b.estimated_value === 'string' ? parseFloat(b.estimated_value) : (b.estimated_value || 0)
    return bValue - aValue
  }

  // Filter active themes (exploring or validated)
  const activeThemes = scoutThemes.filter(t => t.status === 'exploring' || t.status === 'validated')

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold text-sm"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Opportunities
        </h3>
        <button
          onClick={handleAddNew}
          className="text-xs hover:underline"
          style={{ color: 'var(--scout-sky)' }}
        >
          + Add Deal
        </button>
      </div>

      {/* SCOUT THEMES Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--scout-earth-light)' }}>
              SCOUT THEMES
            </span>
            <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
              Exploratory
            </span>
          </div>
          {activeThemes.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
            >
              {activeThemes.length}
            </span>
          )}
        </div>

        {activeThemes.length > 0 ? (
          <div className="space-y-2 mb-3">
            {activeThemes.map(theme => {
              const sizeDisplay = getSizeDisplay(theme.size)
              const isExpanded = expandedTheme === theme.theme_id
              return (
                <div
                  key={theme.theme_id}
                  className="p-3 rounded-lg border cursor-pointer transition-all"
                  style={{ borderColor: 'var(--scout-border)', backgroundColor: isExpanded ? 'var(--scout-parchment)' : 'transparent' }}
                  onClick={() => setExpandedTheme(isExpanded ? null : theme.theme_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--scout-sunset)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                        {theme.title}
                      </span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ backgroundColor: sizeDisplay.bg, color: sizeDisplay.color }}
                    >
                      {sizeDisplay.label}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                      {theme.description && (
                        <p className="text-xs mb-2" style={{ color: 'var(--scout-earth)' }}>
                          {theme.description}
                        </p>
                      )}
                      {theme.why_it_matters && (
                        <p className="text-xs mb-2 italic" style={{ color: 'var(--scout-earth-light)' }}>
                          Why it matters: {theme.why_it_matters}
                        </p>
                      )}
                      {theme.questions_to_explore && theme.questions_to_explore.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                            Questions to explore:
                          </p>
                          <ul className="space-y-1">
                            {theme.questions_to_explore.map((q, i) => (
                              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--scout-earth)' }}>
                                <span style={{ color: 'var(--scout-sky)' }}>?</span>
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConvertToOpportunity(theme) }}
                          className="text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
                          style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                        >
                          Create Opportunity
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismissTheme(theme.theme_id) }}
                          className="text-xs px-2 py-1 rounded transition-colors hover:bg-gray-50"
                          style={{ color: 'var(--scout-earth-light)' }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs py-2 mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            No themes yet. Use AI to explore.
          </p>
        )}

        {/* Explore Themes Button */}
        <button
          onClick={() => setShowExploreChat(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Explore Themes with AI
        </button>
      </div>

      {/* Divider */}
      <div className="border-t my-4" style={{ borderColor: 'var(--scout-border)' }} />

      {/* CRM DEALS Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--scout-earth-light)' }}>
              CRM DEALS
            </span>
            <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
              Execution
            </span>
          </div>
          {pursuits.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
            >
              {pursuits.length}
            </span>
          )}
        </div>

        {pursuits.length > 0 ? (
          <div className="space-y-2">
            {pursuits.sort(sortPursuits).map(pursuit => (
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
        ) : (
          <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
            No CRM deals yet.{' '}
            <button onClick={handleAddNew} style={{ color: 'var(--scout-sky)' }}>
              Add one
            </button>
            {' '}or explore themes first.
          </p>
        )}
      </div>

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pursuit={selectedPursuit}
        accountPlanId={accountPlanId}
        divisions={divisions}
        stakeholders={stakeholders}
        compellingEvents={compellingEvents}
        buyingSignals={buyingSignals}
        onSave={handlePursuitSave}
        onDelete={handlePursuitDelete}
        mode={drawerMode}
      />

      {/* Explore Themes Chat Modal */}
      <ExploreOpportunitiesChat
        isOpen={showExploreChat}
        onClose={() => setShowExploreChat(false)}
        accountPlanId={accountPlanId}
        accountName={accountName}
        signals={signals}
        stakeholders={stakeholders}
        industry={industry}
        onThemeSaved={handleThemeSaved}
      />
    </div>
  )
}
