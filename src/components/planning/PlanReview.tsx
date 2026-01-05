'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'
import type { Account, Stakeholder, Pursuit, ActionItem } from './PlanningContainer'

interface Risk {
  risk_id: string
  account_plan_id: string
  pursuit_id?: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'mitigated' | 'closed' | 'realized'
  mitigation?: string
  impact_on_bant?: 'B' | 'A' | 'N' | 'T' | null
}

interface PlanReviewProps {
  account: Account
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  actionItems: ActionItem[]
  completeness: number
  onPrev: () => void
}

export function PlanReview({
  account,
  stakeholders,
  pursuits,
  actionItems,
  completeness,
  onPrev,
}: PlanReviewProps) {
  const router = useRouter()
  const [isActivating, setIsActivating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [risks, setRisks] = useState<Risk[]>([])

  // Load risks on mount
  useEffect(() => {
    const loadRisks = async () => {
      try {
        const response = await fetch(`/api/accounts/${account.account_plan_id}/risks`)
        if (response.ok) {
          const data = await response.json()
          setRisks(data.risks || [])
        }
      } catch (error) {
        console.error('Failed to load risks:', error)
      }
    }
    loadRisks()
  }, [account.account_plan_id])

  const businessUnits = account.business_units || []
  const openRisks = risks.filter(r => r.status === 'open')
  const criticalRisks = openRisks.filter(r => r.severity === 'critical' || r.severity === 'high')
  const milestones = account.milestones || { day_30: [], day_60: [], day_90: [] }
  const totalMilestones = milestones.day_30.length + milestones.day_60.length + milestones.day_90.length
  const totalPipelineValue = pursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)

  const formatValue = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  // Identify gaps/warnings
  const warnings: string[] = []

  // Check for placeholders without names
  const placeholders = stakeholders.filter(s => s.is_placeholder)
  if (placeholders.length > 0) {
    warnings.push(`${placeholders.length} placeholder role(s) need to be filled`)
  }

  // Check for opportunities without thesis
  const pursuitsWithoutThesis = pursuits.filter(p => !p.thesis)
  if (pursuitsWithoutThesis.length > 0) {
    warnings.push(`${pursuitsWithoutThesis.length} opportunity(ies) missing thesis`)
  }

  // Check for opportunities without engagement plan
  const pursuitsWithoutEngagement = pursuits.filter(p => !p.engagement_plan?.sequence?.length)
  if (pursuitsWithoutEngagement.length > 0) {
    warnings.push(`${pursuitsWithoutEngagement.length} opportunity(ies) missing engagement plan`)
  }

  // Check for business units without stakeholders
  const emptyUnits = businessUnits.filter(u =>
    !stakeholders.some(s => s.business_unit === u.id)
  )
  if (emptyUnits.length > 0) {
    warnings.push(`${emptyUnits.length} business unit(s) have no contacts`)
  }

  // Check for no actions
  if (actionItems.length === 0) {
    warnings.push('No actions defined yet')
  }

  // Check for critical/high risks
  if (criticalRisks.length > 0) {
    warnings.push(`${criticalRisks.length} high/critical risk(s) need attention`)
  }

  const activatePlan = async () => {
    setIsActivating(true)
    try {
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 90)

      const response = await fetch(`/api/accounts/${account.account_plan_id}/plan/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planning_period_start: today.toISOString().split('T')[0],
          planning_period_end: endDate.toISOString().split('T')[0],
        }),
      })

      if (response.ok) {
        router.push(`/accounts/${account.account_plan_id}`)
      }
    } catch (error) {
      console.error('Failed to activate plan:', error)
    } finally {
      setIsActivating(false)
      setShowConfirm(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Plan Review
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Review your plan and activate when ready.
        </p>
      </div>

      {/* Summary Header */}
      <div
        className="p-6 rounded-lg border mb-6"
        style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-saddle)' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <ScoutTerrainMark className="w-10 h-5" color="brown" />
          <div>
            <h3
              className="text-lg font-bold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              {account.account_name}
            </h3>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              90-Day Account Plan
            </p>
          </div>
          <div className="ml-auto text-right">
            <p
              className="text-2xl font-bold"
              style={{ color: completeness >= 80 ? 'var(--scout-trail)' : 'var(--scout-sunset)' }}
            >
              {completeness}%
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Complete
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-white dark:bg-zinc-900 border" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>
              {pursuits.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Opportunities</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white dark:bg-zinc-900 border" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-trail)' }}>
              {formatValue(totalPipelineValue)}
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Pipeline</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white dark:bg-zinc-900 border" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>
              {stakeholders.filter(s => !s.is_placeholder).length}
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Stakeholders</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white dark:bg-zinc-900 border" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-2xl font-semibold" style={{ color: 'var(--scout-earth)' }}>
              {actionItems.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Actions</p>
          </div>
          <div
            className="text-center p-3 rounded-lg border"
            style={{
              backgroundColor: criticalRisks.length > 0 ? 'rgba(169, 68, 66, 0.1)' : 'white',
              borderColor: criticalRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-border)',
            }}
          >
            <p
              className="text-2xl font-semibold"
              style={{ color: openRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-trail)' }}
            >
              {openRisks.length}
            </p>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Open Risks</p>
          </div>
        </div>

        {/* Milestones Summary */}
        {totalMilestones > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
              90-Day Milestones
            </p>
            <div className="flex gap-4 text-sm">
              <span style={{ color: 'var(--scout-earth-light)' }}>
                Day 30: {milestones.day_30.length} goals
              </span>
              <span style={{ color: 'var(--scout-earth-light)' }}>
                Day 60: {milestones.day_60.length} goals
              </span>
              <span style={{ color: 'var(--scout-earth-light)' }}>
                Day 90: {milestones.day_90.length} goals
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Strategy */}
      {account.account_strategy && (
        <div
          className="p-4 rounded-lg border mb-6"
          style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
        >
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--scout-earth)' }}>
            Account Strategy
          </h4>
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            {account.account_strategy.slice(0, 300)}
            {account.account_strategy.length > 300 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div
          className="p-4 rounded-lg border mb-6"
          style={{ backgroundColor: 'rgba(210, 105, 30, 0.1)', borderColor: 'rgba(210, 105, 30, 0.3)' }}
        >
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--scout-sunset)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Items to Address
          </h4>
          <ul className="space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--scout-sunset)' }}>
                • {warning}
              </li>
            ))}
          </ul>
          <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>
            You can still activate your plan and address these later.
          </p>
        </div>
      )}

      {/* Opportunities Preview */}
      <div
        className="p-4 rounded-lg border mb-6"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--scout-earth)' }}>
          Opportunities
        </h4>
        <div className="space-y-2">
          {pursuits.map(p => (
            <div
              key={p.pursuit_id}
              className="flex items-center justify-between p-2 rounded"
              style={{ backgroundColor: 'var(--scout-parchment)' }}
            >
              <div>
                <span className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {p.name}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {p.stage || 'Prospecting'}
                </span>
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--scout-trail)' }}>
                {p.estimated_value ? formatValue(p.estimated_value) : 'TBD'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risks Preview */}
      {openRisks.length > 0 && (
        <div
          className="p-4 rounded-lg border mb-6"
          style={{
            backgroundColor: criticalRisks.length > 0 ? 'rgba(169, 68, 66, 0.05)' : 'white',
            borderColor: criticalRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-border)',
          }}
        >
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: criticalRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-earth)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Open Risks ({openRisks.length})
          </h4>
          <div className="space-y-2">
            {openRisks.map(risk => {
              const pursuit = pursuits.find(p => p.pursuit_id === risk.pursuit_id)
              return (
                <div
                  key={risk.risk_id}
                  className="flex items-start justify-between p-2 rounded"
                  style={{
                    backgroundColor: risk.severity === 'critical' || risk.severity === 'high'
                      ? 'rgba(169, 68, 66, 0.1)'
                      : 'var(--scout-parchment)',
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: risk.severity === 'critical' ? 'var(--scout-clay)'
                            : risk.severity === 'high' ? 'rgba(169, 68, 66, 0.15)'
                            : risk.severity === 'medium' ? 'rgba(210, 105, 30, 0.15)'
                            : 'rgba(93, 122, 93, 0.15)',
                          color: risk.severity === 'critical' ? 'white'
                            : risk.severity === 'high' ? 'var(--scout-clay)'
                            : risk.severity === 'medium' ? 'var(--scout-sunset)'
                            : 'var(--scout-trail)',
                        }}
                      >
                        {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                      </span>
                      {risk.impact_on_bant && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                        >
                          {risk.impact_on_bant}
                        </span>
                      )}
                      {pursuit && (
                        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                          {pursuit.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                      {risk.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activate Confirmation */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Activate 90-Day Plan?
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
              This will start your 90-day planning period. Milestones and progress will be tracked
              from today.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium border rounded-lg"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Cancel
              </button>
              <button
                onClick={activatePlan}
                disabled={isActivating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {isActivating ? 'Activating...' : 'Activate Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 pt-4 flex justify-between border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm font-medium transition-colors hover:underline"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          ← Back
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          style={{ backgroundColor: 'var(--scout-trail)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Activate 90-Day Plan
        </button>
      </div>
    </div>
  )
}
