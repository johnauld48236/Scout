'use client'

import { useState, useEffect } from 'react'
import { AccountHealthBanner } from './AccountHealthBanner'
import { DiscoveryMode } from './DiscoveryMode'
import { ExecutionMode } from './ExecutionMode'

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

interface Signal {
  signal_id: string
  title?: string
  summary: string
  signal_type?: string
  signal_date: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value?: number
  thesis?: string
}

interface TrackerAction {
  action_id: string
  description: string
  due_date?: string
  status: string
  bucket: '30' | '60' | '90'
  priority?: string
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

interface AccountModeViewProps {
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
  onRefresh?: () => void
  forceMode?: 'discovery' | 'execution' | null
  onSwitchToClassic: () => void
}

export function AccountModeView({
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
  onRefresh,
  forceMode,
  onSwitchToClassic,
}: AccountModeViewProps) {
  // Determine mode based on data completeness
  // Execution mode if: has divisions OR 3+ stakeholders OR has signals OR has tracker
  const hasEnoughData = divisions.length > 0 || stakeholders.length >= 3 || signals.length > 0 || hasTracker

  const [mode, setMode] = useState<'discovery' | 'execution'>(
    forceMode || (hasEnoughData ? 'execution' : 'discovery')
  )

  // Update mode if forceMode changes
  useEffect(() => {
    if (forceMode) {
      setMode(forceMode)
    }
  }, [forceMode])

  const handleSwitchToExecution = () => setMode('execution')
  const handleSwitchToDiscovery = () => setMode('discovery')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Always show health banner */}
      <AccountHealthBanner
        accountId={accountId}
        accountName={accountName}
        industry={industry}
        headquarters={headquarters}
        employeeCount={employeeCount}
        website={website}
        signals={signals}
        divisionsCount={divisions.length}
        stakeholdersCount={stakeholders.length}
        pursuitsCount={pursuits.length}
        isFavorite={isFavorite}
        inWeeklyReview={inWeeklyReview}
        lastRefreshed={lastRefreshed}
        onRefresh={onRefresh}
      />

      {/* Mode-specific content */}
      {mode === 'discovery' ? (
        <DiscoveryMode
          accountId={accountId}
          accountName={accountName}
          website={website}
          industry={industry}
          divisions={divisions}
          stakeholders={stakeholders}
          signals={signals}
          pursuits={pursuits}
          hasTracker={hasTracker}
          onSwitchToExecution={handleSwitchToExecution}
        />
      ) : (
        <ExecutionMode
          accountId={accountId}
          accountName={accountName}
          trackerActions={trackerActions}
          divisions={divisions}
          stakeholders={stakeholders}
          signals={signals}
          pursuits={pursuits}
          painPoints={painPoints}
          risks={risks}
          scoutThemes={scoutThemes}
          onSwitchToDiscovery={handleSwitchToDiscovery}
          onSwitchToClassic={onSwitchToClassic}
        />
      )}
    </div>
  )
}
