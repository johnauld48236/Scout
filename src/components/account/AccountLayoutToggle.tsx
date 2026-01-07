'use client'

import { useState, useEffect } from 'react'
import { AccountModeView } from './AccountModeView'

interface Signal {
  signal_id: string
  title?: string
  summary: string
  signal_type?: string
  signal_date: string
}

interface Division {
  division_id: string
  name: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  influence_level?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value?: number
  thesis?: string
}

interface PainPoint {
  pain_point_id: string
  description: string
  severity?: string
}

interface Risk {
  risk_id: string
  description: string
  likelihood?: string
}

interface ScoutTheme {
  theme_id: string
  title: string
  description: string
  why_it_matters: string
  size: string
  questions_to_explore: string[]
  status: string
}

interface TrackerAction {
  action_id: string
  description: string
  due_date?: string
  status: string
  bucket: '30' | '60' | '90'
  priority?: string
}

interface AccountLayoutToggleProps {
  // Data for new layout
  accountId: string
  accountName: string
  industry?: string
  headquarters?: string
  employeeCount?: number
  website?: string
  divisions: Division[]
  stakeholders: Stakeholder[]
  signals: Signal[]
  pursuits: Pursuit[]
  trackerActions: TrackerAction[]
  painPoints: PainPoint[]
  risks: Risk[]
  scoutThemes: ScoutTheme[]
  hasTracker: boolean
  isFavorite: boolean
  inWeeklyReview: boolean
  lastRefreshed?: string
  // Children is the old layout
  children: React.ReactNode
}

export function AccountLayoutToggle({
  accountId,
  accountName,
  industry,
  headquarters,
  employeeCount,
  website,
  divisions,
  stakeholders,
  signals,
  pursuits,
  trackerActions,
  painPoints,
  risks,
  scoutThemes,
  hasTracker,
  isFavorite,
  inWeeklyReview,
  lastRefreshed,
  children,
}: AccountLayoutToggleProps) {
  // Check localStorage for saved preference
  const [useNewLayout, setUseNewLayout] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('account-layout-preference')
    if (saved === 'new') {
      setUseNewLayout(true)
    }
  }, [])

  const toggleLayout = () => {
    const newValue = !useNewLayout
    setUseNewLayout(newValue)
    localStorage.setItem('account-layout-preference', newValue ? 'new' : 'classic')
  }

  const switchToClassic = () => {
    setUseNewLayout(false)
    localStorage.setItem('account-layout-preference', 'classic')
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <>
      {/* Layout Toggle Button - Fixed position */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleLayout}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium transition-all hover:shadow-xl"
          style={{
            backgroundColor: 'var(--scout-white)',
            borderColor: 'var(--scout-border)',
            color: 'var(--scout-saddle)',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          {useNewLayout ? 'Classic View' : 'New View'}
          <span
            className="px-1.5 py-0.5 text-xs rounded"
            style={{
              backgroundColor: useNewLayout ? 'rgba(93, 122, 93, 0.15)' : 'rgba(56, 152, 199, 0.15)',
              color: useNewLayout ? 'var(--scout-trail)' : 'var(--scout-sky)',
            }}
          >
            {useNewLayout ? 'BETA' : 'TRY'}
          </span>
        </button>
      </div>

      {/* Render appropriate layout */}
      {useNewLayout ? (
        <AccountModeView
          accountId={accountId}
          accountName={accountName}
          industry={industry}
          headquarters={headquarters}
          employeeCount={employeeCount}
          website={website}
          divisions={divisions}
          stakeholders={stakeholders}
          signals={signals}
          pursuits={pursuits}
          trackerActions={trackerActions}
          painPoints={painPoints}
          risks={risks}
          scoutThemes={scoutThemes}
          hasTracker={hasTracker}
          isFavorite={isFavorite}
          inWeeklyReview={inWeeklyReview}
          lastRefreshed={lastRefreshed}
          onSwitchToClassic={switchToClassic}
        />
      ) : (
        children
      )}
    </>
  )
}
