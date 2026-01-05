'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RiskCard } from './RiskCard'

interface Risk {
  risk_id: string
  description: string
  severity: string
  status: string
  pursuit_id?: string
  pursuit_ids?: string[]
  impact_on_bant?: string
  target_date?: string
  mitigation?: string
}

interface Action {
  action_id: string
  title: string
  status?: string
  due_date?: string
  priority?: string
  risk_id?: string
}

interface Bucket {
  bucket_id: string
  name: string
  color: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface RisksSectionProps {
  accountPlanId: string
  risks: Risk[]
  buckets: Bucket[]
  pursuits: Pursuit[]
  actions?: Action[]
}

export function RisksSection({ accountPlanId, risks, buckets, pursuits, actions = [] }: RisksSectionProps) {
  const [showClosed, setShowClosed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Group actions by risk_id
  const actionsByRisk = new Map<string, Action[]>()
  actions.forEach(action => {
    if (action.risk_id) {
      const existing = actionsByRisk.get(action.risk_id) || []
      existing.push(action)
      actionsByRisk.set(action.risk_id, existing)
    }
  })

  const openRisks = risks.filter(r => r.status === 'open')
  const closedRisks = risks.filter(r => r.status !== 'open')
  const criticalRisks = openRisks.filter(r => r.severity === 'critical' || r.severity === 'high')

  // Don't render anything if no risks at all
  if (risks.length === 0) {
    return null
  }

  // Get pursuit name for a risk
  const getPursuitName = (risk: Risk) => {
    if (risk.pursuit_id) {
      return pursuits.find(p => p.pursuit_id === risk.pursuit_id)?.name
    }
    return undefined
  }

  const getPursuitNames = (risk: Risk) => {
    if (risk.pursuit_ids && risk.pursuit_ids.length > 0) {
      return risk.pursuit_ids
        .map(id => pursuits.find(p => p.pursuit_id === id)?.name)
        .filter(Boolean) as string[]
    }
    return undefined
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: criticalRisks.length > 0 ? 'rgba(169, 68, 66, 0.05)' : 'white',
        borderColor: criticalRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-border)',
      }}
    >
      {/* Header - Clickable to expand/collapse */}
      <div
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3
          className="font-semibold text-sm flex items-center gap-2"
          style={{
            color: criticalRisks.length > 0 ? 'var(--scout-clay)' : 'var(--scout-saddle)',
            fontFamily: "'Bitter', Georgia, serif",
          }}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {openRisks.length > 0 ? `Open Risks (${openRisks.length})` : 'Risks'}
        </h3>
        <Link
          href={`/accounts/${accountPlanId}/plan?step=4`}
          className="text-xs"
          style={{ color: 'var(--scout-sky)' }}
          onClick={(e) => e.stopPropagation()}
        >
          Manage →
        </Link>
      </div>

      {/* Open Risks - Collapsible */}
      {isExpanded && (
        <>
      {openRisks.length > 0 ? (
        <div className="space-y-2">
          {openRisks.map(risk => (
            <RiskCard
              key={risk.risk_id}
              risk={risk}
              pursuitName={getPursuitName(risk)}
              pursuitNames={getPursuitNames(risk)}
              accountPlanId={accountPlanId}
              buckets={buckets}
              pursuits={pursuits}
              linkedActions={actionsByRisk.get(risk.risk_id) || []}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-center py-2" style={{ color: 'var(--scout-earth-light)' }}>
          No open risks - great job!
        </p>
      )}

      {/* Closed Risks Fold */}
      {closedRisks.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          <button
            onClick={() => setShowClosed(!showClosed)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <svg
                className={`w-3 h-3 transition-transform ${showClosed ? 'rotate-90' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>
                Closed Risks ({closedRisks.length})
              </span>
            </div>
            <svg
              className="w-3.5 h-3.5"
              style={{ color: 'var(--scout-trail)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>

          {showClosed && (
            <div className="mt-2 space-y-2">
              {closedRisks.map(risk => (
                <div
                  key={risk.risk_id}
                  className="p-2 rounded-lg opacity-60"
                  style={{ backgroundColor: 'rgba(93, 122, 93, 0.08)' }}
                >
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: 'var(--scout-trail)' }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-xs line-through"
                        style={{ color: 'var(--scout-earth-light)' }}
                      >
                        {risk.description}
                      </span>
                      {risk.mitigation && (
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: 'var(--scout-trail)' }}
                        >
                          Resolved: {risk.mitigation}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                      style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                    >
                      {risk.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}
