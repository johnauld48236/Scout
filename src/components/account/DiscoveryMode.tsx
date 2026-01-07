'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

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
  summary: string
  signal_type?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
}

interface DiscoveryModeProps {
  accountId: string
  accountName: string
  website?: string
  industry?: string
  divisions: Division[]
  stakeholders: Stakeholder[]
  signals: Signal[]
  pursuits: Pursuit[]
  hasTracker: boolean
  onSwitchToExecution: () => void
}

export function DiscoveryMode({
  accountId,
  accountName,
  website,
  industry,
  divisions,
  stakeholders,
  signals,
  pursuits,
  hasTracker,
  onSwitchToExecution,
}: DiscoveryModeProps) {
  const router = useRouter()
  const [isEnrichingStructure, setIsEnrichingStructure] = useState(false)
  const [isEnrichingStakeholders, setIsEnrichingStakeholders] = useState(false)
  const [isGatheringIntel, setIsGatheringIntel] = useState(false)

  // Progress indicators
  type ProgressStatus = 'pending' | 'partial' | 'complete'
  const structureProgress: ProgressStatus = divisions.length > 0 ? 'complete' : 'pending'
  const stakeholderProgress: ProgressStatus = stakeholders.length >= 3 ? 'complete' : stakeholders.length > 0 ? 'partial' : 'pending'
  const intelligenceProgress: ProgressStatus = signals.length > 0 ? 'complete' : 'pending'
  const opportunitiesProgress: ProgressStatus = pursuits.length > 0 ? 'complete' : 'pending'
  const planProgress: ProgressStatus = hasTracker ? 'complete' : 'pending'

  // AI Actions
  const handleEnrichStructure = async () => {
    setIsEnrichingStructure(true)
    try {
      await fetch('/api/ai/enrich-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountName,
          domain: website,
          industry,
          accountId,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Structure enrichment failed:', error)
    } finally {
      setIsEnrichingStructure(false)
    }
  }

  const handleFindStakeholders = async () => {
    setIsEnrichingStakeholders(true)
    try {
      await fetch('/api/ai/find-stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountName,
          domain: website,
          industry,
          accountId,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Stakeholder search failed:', error)
    } finally {
      setIsEnrichingStakeholders(false)
    }
  }

  const handleGatherIntelligence = async () => {
    setIsGatheringIntel(true)
    try {
      await fetch('/api/ai/account-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountName,
          domain: website,
          industry,
          accountPlanId: accountId,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Intelligence gathering failed:', error)
    } finally {
      setIsGatheringIntel(false)
    }
  }

  const cards = [
    {
      number: 1,
      title: 'Structure',
      subtitle: 'Corporate Structure',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      description: 'Map divisions & business units',
      status: structureProgress,
      count: divisions.length,
      countLabel: 'mapped',
      aiLabel: 'AI Map',
      manualLabel: '+ Manual',
      isLoading: isEnrichingStructure,
      onAIClick: handleEnrichStructure,
      onManualClick: () => router.push(`/accounts/${accountId}#divisions`),
    },
    {
      number: 2,
      title: 'People',
      subtitle: 'Stakeholders',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      description: 'Find contacts & key players',
      status: stakeholderProgress,
      count: stakeholders.length,
      countLabel: 'contacts',
      aiLabel: 'Find',
      manualLabel: '+ Add',
      isLoading: isEnrichingStakeholders,
      onAIClick: handleFindStakeholders,
      onManualClick: () => router.push(`/accounts/${accountId}#stakeholders`),
    },
    {
      number: 3,
      title: 'Signals',
      subtitle: 'Intelligence',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      description: 'News, events, buying signals',
      status: intelligenceProgress,
      count: signals.length,
      countLabel: 'signals',
      aiLabel: 'Gather',
      manualLabel: null,
      isLoading: isGatheringIntel,
      onAIClick: handleGatherIntelligence,
      onManualClick: null,
    },
    {
      number: 4,
      title: 'Explore',
      subtitle: 'Opportunities',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      description: 'AI connects signals to themes',
      status: opportunitiesProgress,
      count: pursuits.length,
      countLabel: 'themes',
      aiLabel: 'Explore',
      manualLabel: null,
      isLoading: false,
      onAIClick: () => router.push(`/accounts/${accountId}/explore`),
      onManualClick: null,
    },
    {
      number: 5,
      title: 'Plan',
      subtitle: '30/60/90',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      description: 'Build your action plan',
      status: planProgress,
      count: hasTracker ? 1 : 0,
      countLabel: hasTracker ? 'Active' : 'Empty',
      aiLabel: 'Suggest',
      manualLabel: null,
      isLoading: false,
      onAIClick: () => router.push(`/accounts/${accountId}/plan-builder`),
      onManualClick: null,
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
          Build Your Account Intelligence
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Complete these steps in any order to understand {accountName}
        </p>
      </div>

      {/* Discovery Cards Grid */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {cards.slice(0, 3).map((card) => (
          <DiscoveryCard key={card.number} {...card} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto mb-8">
        {cards.slice(3, 5).map((card) => (
          <DiscoveryCard key={card.number} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-6" style={{ borderColor: 'var(--scout-border)' }}>
        <p className="text-sm text-center mb-4" style={{ color: 'var(--scout-earth-light)' }}>
          Or jump directly to:
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.push(`/accounts/${accountId}#import`)}
            className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            Import Notes
          </button>
          <button
            onClick={() => router.push(`/accounts/${accountId}#opportunities`)}
            className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            Add Opportunity
          </button>
          <button
            onClick={() => router.push(`/accounts/${accountId}#actions`)}
            className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            Add Action
          </button>
        </div>
      </div>

      {/* Switch to Execution Mode (if available) */}
      {(divisions.length > 0 || stakeholders.length >= 3 || signals.length > 0) && (
        <div className="text-center mt-8">
          <button
            onClick={onSwitchToExecution}
            className="text-sm font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            Switch to Execution View →
          </button>
        </div>
      )}
    </div>
  )
}

function DiscoveryCard({
  number,
  title,
  subtitle,
  icon,
  description,
  status,
  count,
  countLabel,
  aiLabel,
  manualLabel,
  isLoading,
  onAIClick,
  onManualClick,
}: {
  number: number
  title: string
  subtitle: string
  icon: React.ReactNode
  description: string
  status: 'pending' | 'partial' | 'complete'
  count: number
  countLabel: string
  aiLabel: string
  manualLabel: string | null
  isLoading: boolean
  onAIClick: () => void
  onManualClick: (() => void) | null
}) {
  const statusColors = {
    pending: { border: 'var(--scout-border)', bg: 'var(--scout-white)' },
    partial: { border: 'var(--scout-sunset)', bg: 'rgba(210, 105, 30, 0.05)' },
    complete: { border: 'var(--scout-trail)', bg: 'rgba(93, 122, 93, 0.05)' },
  }

  return (
    <div
      className="rounded-xl border p-5 transition-all hover:shadow-md"
      style={{
        backgroundColor: statusColors[status].bg,
        borderColor: statusColors[status].border,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: status === 'complete' ? 'var(--scout-trail)' : 'var(--scout-saddle)',
              color: 'white',
            }}
          >
            {status === 'complete' ? '✓' : number}
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>{title}</p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Icon */}
      <div className="flex justify-center mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        {icon}
      </div>

      {/* Description */}
      <p className="text-sm text-center mb-4" style={{ color: 'var(--scout-earth)' }}>
        {description}
      </p>

      {/* Status */}
      <div className="text-center mb-4">
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{
            backgroundColor: status === 'complete' ? 'rgba(93, 122, 93, 0.15)' : 'var(--scout-parchment)',
            color: status === 'complete' ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
          }}
        >
          {count} {countLabel}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAIClick}
          disabled={isLoading}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <ScoutAIIcon size={16} className="text-white" />
          )}
          {aiLabel}
        </button>
        {manualLabel && onManualClick && (
          <button
            onClick={onManualClick}
            className="px-3 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            {manualLabel}
          </button>
        )}
      </div>
    </div>
  )
}
