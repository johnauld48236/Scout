'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SALES_METHODOLOGIES, SalesMethodologyType } from '@/lib/ai/context/company-profile'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  department?: string
  role_type?: string
  sentiment?: string
  business_unit?: string
}

interface Props {
  accountPlanId: string
  accountName: string
  stakeholders: Stakeholder[]
  methodology?: SalesMethodologyType
}

// Compact sentiment indicator
function SentimentDot({ sentiment, size = 'sm' }: { sentiment?: string; size?: 'sm' | 'md' }) {
  const colors: Record<string, string> = {
    'Strong_Advocate': 'bg-green-500',
    'Supportive': 'bg-green-400',
    'Neutral': 'bg-zinc-400',
    'Skeptical': 'bg-yellow-500',
    'Opponent': 'bg-red-500',
    'Unknown': 'bg-zinc-300',
  }
  const sizeClass = size === 'md' ? 'w-3 h-3' : 'w-2 h-2'
  return (
    <div
      className={`${sizeClass} rounded-full ${colors[sentiment || 'Unknown']} flex-shrink-0`}
      title={sentiment?.replace('_', ' ') || 'Unknown'}
    />
  )
}

// Role type badge - compact
function RoleBadge({ role, compact = false }: { role?: string; compact?: boolean }) {
  const config: Record<string, { bg: string; letter: string; full: string }> = {
    'Economic_Buyer': { bg: 'bg-purple-500', letter: 'EB', full: 'Economic Buyer' },
    'Technical_Buyer': { bg: 'bg-blue-500', letter: 'TB', full: 'Technical Buyer' },
    'Champion': { bg: 'bg-green-500', letter: 'CH', full: 'Champion' },
    'Influencer': { bg: 'bg-yellow-500', letter: 'IN', full: 'Influencer' },
    'Blocker': { bg: 'bg-red-500', letter: 'BL', full: 'Blocker' },
    'Coach': { bg: 'bg-teal-500', letter: 'CO', full: 'Coach' },
    'End_User': { bg: 'bg-zinc-500', letter: 'EU', full: 'End User' },
  }

  const info = config[role || '']
  if (!info) return null

  if (compact) {
    return (
      <span
        className={`${info.bg} text-white text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center`}
        title={info.full}
      >
        {info.letter}
      </span>
    )
  }

  return (
    <span className={`${info.bg} text-white text-xs px-1.5 py-0.5 rounded font-medium`}>
      {info.full}
    </span>
  )
}

// Coverage health score
function getCoverageHealth(stakeholders: Stakeholder[], methodology: SalesMethodologyType): {
  score: number
  level: 'critical' | 'weak' | 'moderate' | 'strong'
  missing: string[]
} {
  const roles = stakeholders.map(s => s.role_type).filter(Boolean)

  const requiredByMethodology: Record<string, string[]> = {
    'BANT': ['Economic_Buyer'],
    'MEDDICC': ['Economic_Buyer', 'Champion'],
    'MEDDPICC': ['Economic_Buyer', 'Champion'],
    'SPIN': ['Economic_Buyer'],
    'Challenger': ['Economic_Buyer', 'Champion'],
    'Custom': ['Economic_Buyer'],
  }

  const required = requiredByMethodology[methodology] || ['Economic_Buyer']
  const missing = required.filter(r => !roles.includes(r))

  const hasChampion = roles.includes('Champion')
  const hasEB = roles.includes('Economic_Buyer')
  const hasTB = roles.includes('Technical_Buyer')
  const totalContacts = stakeholders.length

  let score = 0
  if (hasEB) score += 40
  if (hasChampion) score += 30
  if (hasTB) score += 15
  if (totalContacts >= 3) score += 15

  const level = score >= 70 ? 'strong' : score >= 50 ? 'moderate' : score >= 25 ? 'weak' : 'critical'

  return { score, level, missing }
}

export function OrgCoverageMap({ accountPlanId, accountName, stakeholders, methodology = 'BANT' }: Props) {
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null)

  const methodologyInfo = SALES_METHODOLOGIES[methodology]

  // Group stakeholders by department/business unit
  const groupedStakeholders = useMemo(() => {
    const groups: Record<string, Stakeholder[]> = {}

    stakeholders.forEach(s => {
      const key = s.department || s.business_unit || 'Unassigned'
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })

    // Sort by number of stakeholders (most first)
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [stakeholders])

  // Calculate coverage
  const coverage = getCoverageHealth(stakeholders, methodology)

  // Role coverage summary
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    stakeholders.forEach(s => {
      if (s.role_type) {
        counts[s.role_type] = (counts[s.role_type] || 0) + 1
      }
    })
    return counts
  }, [stakeholders])

  // Sentiment summary
  const sentimentSummary = useMemo(() => {
    let advocates = 0, neutral = 0, opponents = 0
    stakeholders.forEach(s => {
      if (s.sentiment === 'Strong_Advocate' || s.sentiment === 'Supportive') advocates++
      else if (s.sentiment === 'Skeptical' || s.sentiment === 'Opponent') opponents++
      else neutral++
    })
    return { advocates, neutral, opponents }
  }, [stakeholders])

  // Action items based on gaps
  const actionItems = useMemo(() => {
    const items: Array<{ priority: 'high' | 'medium'; action: string; icon: string }> = []

    if (!roleCounts['Economic_Buyer']) {
      items.push({ priority: 'high', action: 'Find the Economic Buyer', icon: '💰' })
    }
    if (!roleCounts['Champion'] && (methodology === 'MEDDICC' || methodology === 'MEDDPICC')) {
      items.push({ priority: 'high', action: 'Identify a Champion', icon: '⭐' })
    }
    if (sentimentSummary.opponents > sentimentSummary.advocates) {
      items.push({ priority: 'high', action: 'Address blockers/skeptics', icon: '⚠️' })
    }
    if (stakeholders.length < 3) {
      items.push({ priority: 'medium', action: 'Expand stakeholder map', icon: '👥' })
    }
    if (!roleCounts['Technical_Buyer']) {
      items.push({ priority: 'medium', action: 'Engage Technical Buyer', icon: '🔧' })
    }

    return items
  }, [roleCounts, sentimentSummary, methodology, stakeholders.length])

  const levelColors = {
    critical: 'bg-red-500',
    weak: 'bg-yellow-500',
    moderate: 'bg-blue-500',
    strong: 'bg-green-500',
  }

  return (
    <div className="space-y-4">
      {/* Header with coverage score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Stakeholder Coverage
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${levelColors[coverage.level]}`} />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {coverage.score}% Coverage
            </span>
          </div>
        </div>
        <Link
          href={`/accounts/${accountPlanId}/org-builder`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          Edit Map →
        </Link>
      </div>

      {/* Action signals - only show if there are actions */}
      {actionItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionItems.slice(0, 3).map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                item.priority === 'high'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.action}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main visualization grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left: Role coverage scorecard */}
        <div className="col-span-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
            {methodologyInfo.name} Coverage
          </h3>
          <div className="space-y-2">
            {['Economic_Buyer', 'Champion', 'Technical_Buyer', 'Influencer', 'Coach'].map(role => {
              const count = roleCounts[role] || 0
              const isRequired = coverage.missing.includes(role) ||
                (role === 'Economic_Buyer') ||
                (role === 'Champion' && (methodology === 'MEDDICC' || methodology === 'MEDDPICC'))

              return (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={role} compact />
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {role.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    count === 0 && isRequired
                      ? 'text-red-600 dark:text-red-400'
                      : count > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-400'
                  }`}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Sentiment bar */}
          <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Sentiment</h4>
            <div className="flex h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
              {sentimentSummary.advocates > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(sentimentSummary.advocates / stakeholders.length) * 100}%` }}
                  title={`${sentimentSummary.advocates} supportive`}
                />
              )}
              {sentimentSummary.neutral > 0 && (
                <div
                  className="bg-zinc-400 h-full"
                  style={{ width: `${(sentimentSummary.neutral / stakeholders.length) * 100}%` }}
                  title={`${sentimentSummary.neutral} neutral/unknown`}
                />
              )}
              {sentimentSummary.opponents > 0 && (
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${(sentimentSummary.opponents / stakeholders.length) * 100}%` }}
                  title={`${sentimentSummary.opponents} skeptical/opposed`}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
              <span>{sentimentSummary.advocates} allies</span>
              <span>{sentimentSummary.opponents} concerns</span>
            </div>
          </div>
        </div>

        {/* Right: Department/Unit map - Shows penetration by area */}
        <div className="col-span-9">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
            Penetration by Department
            <span className="font-normal normal-case ml-2 text-zinc-400">(click to expand)</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {groupedStakeholders.map(([department, people]) => {
              const isExpanded = expandedUnit === department
              const deptRoles = [...new Set(people.map(p => p.role_type).filter(Boolean))]
              const hasEB = people.some(p => p.role_type === 'Economic_Buyer')
              const hasChamp = people.some(p => p.role_type === 'Champion')
              const hasBlocker = people.some(p => p.role_type === 'Blocker')
              const supportiveCount = people.filter(p =>
                p.sentiment === 'Strong_Advocate' || p.sentiment === 'Supportive'
              ).length
              const concernCount = people.filter(p =>
                p.sentiment === 'Skeptical' || p.sentiment === 'Opponent'
              ).length

              // Determine card priority/border color
              let borderClass = 'border-zinc-200 dark:border-zinc-700'
              if (hasEB || hasChamp) {
                borderClass = 'border-green-400 dark:border-green-600 border-2'
              } else if (hasBlocker || concernCount > supportiveCount) {
                borderClass = 'border-amber-400 dark:border-amber-600 border-2'
              }

              return (
                <div
                  key={department}
                  className={`rounded-lg transition-all cursor-pointer bg-white dark:bg-zinc-900 ${borderClass} ${
                    isExpanded ? 'col-span-3' : ''
                  } hover:shadow-md`}
                  onClick={() => setExpandedUnit(isExpanded ? null : department)}
                >
                  {/* Department header - compact */}
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {department}
                      </h4>
                      <div className="flex items-center gap-1">
                        {/* Key indicators */}
                        {hasEB && <span className="text-[10px]" title="Economic Buyer">💰</span>}
                        {hasChamp && <span className="text-[10px]" title="Champion">⭐</span>}
                        {hasBlocker && <span className="text-[10px]" title="Blocker">⚠️</span>}
                        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
                          {people.length}
                        </span>
                      </div>
                    </div>

                    {/* Compact role badges + sentiment bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {deptRoles.slice(0, 3).map(role => (
                          <RoleBadge key={role} role={role} compact />
                        ))}
                        {deptRoles.length > 3 && (
                          <span className="text-[10px] text-zinc-400">+{deptRoles.length - 3}</span>
                        )}
                        {deptRoles.length === 0 && (
                          <span className="text-[10px] text-zinc-400 italic">unassigned</span>
                        )}
                      </div>
                      {/* Mini sentiment bar */}
                      <div className="flex items-center gap-0.5">
                        {people.slice(0, 4).map(p => (
                          <SentimentDot key={p.stakeholder_id} sentiment={p.sentiment} />
                        ))}
                        {people.length > 4 && (
                          <span className="text-[10px] text-zinc-400">+{people.length - 4}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Show all people in this department */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-2 grid grid-cols-3 gap-1.5">
                      {people.map(person => (
                        <div
                          key={person.stakeholder_id}
                          className="flex items-center gap-1.5 p-1.5 rounded bg-zinc-50 dark:bg-zinc-800/50"
                        >
                          <SentimentDot sentiment={person.sentiment} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {person.full_name}
                            </p>
                            <p className="text-[10px] text-zinc-500 truncate">{person.title}</p>
                          </div>
                          {person.role_type && <RoleBadge role={person.role_type} compact />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Empty state / Add more prompt */}
            {groupedStakeholders.length === 0 && (
              <div className="col-span-3 text-center py-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                  No stakeholders mapped yet
                </p>
                <Link
                  href={`/accounts/${accountPlanId}/org-builder`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                >
                  Build Org Chart →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
