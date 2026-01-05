'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Stakeholder {
  stakeholder_id: string
  account_plan_id: string
  full_name: string
  title?: string
  department?: string
  role_type?: string
  sentiment?: string
  engagement_level?: string
  influence_score?: number
  reports_to_id?: string
  org_level?: number
}

interface Pursuit {
  pursuit_id: string
  name: string
  description?: string
}

interface AccountContext {
  account_name: string
  industry?: string
  employee_count?: string
}

interface OrgGap {
  suggested_title: string
  department?: string
  why_important: string
  role_type: string
  priority: 'High' | 'Medium' | 'Low'
}

interface OrgChartSectionProps {
  stakeholders: Stakeholder[]
  onEditStakeholder?: (stakeholder: Stakeholder) => void
  accountContext?: AccountContext
  pursuits?: Pursuit[]
  accountPlanId?: string
  onAddStakeholder?: (stakeholder: Partial<Stakeholder>) => void
}

interface OrgNode extends Stakeholder {
  children: OrgNode[]
}

function buildOrgTree(stakeholders: Stakeholder[]): OrgNode[] {
  const stakeholderMap = new Map<string, OrgNode>()

  // Create nodes for all stakeholders
  stakeholders.forEach(s => {
    stakeholderMap.set(s.stakeholder_id, { ...s, children: [] })
  })

  const roots: OrgNode[] = []

  // Build the tree
  stakeholders.forEach(s => {
    const node = stakeholderMap.get(s.stakeholder_id)!
    if (s.reports_to_id && stakeholderMap.has(s.reports_to_id)) {
      const parent = stakeholderMap.get(s.reports_to_id)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Sort each level by org_level, then by name
  const sortNodes = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => {
      const levelDiff = (a.org_level || 99) - (b.org_level || 99)
      if (levelDiff !== 0) return levelDiff
      return a.full_name.localeCompare(b.full_name)
    })
    nodes.forEach(n => sortNodes(n.children))
  }

  sortNodes(roots)

  return roots
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  const colors: Record<string, string> = {
    'Strong_Advocate': 'bg-green-500',
    'Supportive': 'bg-green-400',
    'Neutral': 'bg-zinc-400',
    'Skeptical': 'bg-yellow-500',
    'Opponent': 'bg-red-500',
    'Unknown': 'bg-zinc-300',
  }
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${colors[sentiment || 'Unknown']}`}
      title={sentiment?.replace('_', ' ') || 'Unknown'}
    />
  )
}

function RoleBadge({ role }: { role?: string }) {
  const colors: Record<string, string> = {
    'Economic_Buyer': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Technical_Buyer': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Champion': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Influencer': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Blocker': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Coach': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'End_User': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  if (!role || role === 'Unknown') return null
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[role] || 'bg-zinc-100 text-zinc-600'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

function OrgNodeCard({
  node,
  onEdit,
  isExpanded,
  onToggleExpand,
  hasChildren
}: {
  node: OrgNode
  onEdit?: (s: Stakeholder) => void
  isExpanded: boolean
  onToggleExpand: () => void
  hasChildren: boolean
}) {
  return (
    <div
      className="inline-flex flex-col items-center cursor-pointer group"
      onClick={() => onEdit?.(node)}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 min-w-[180px] hover:border-blue-400 dark:hover:border-blue-500 transition-colors shadow-sm">
        <div className="flex items-start gap-2">
          <SentimentDot sentiment={node.sentiment} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {node.full_name}
            </p>
            {node.title && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {node.title}
              </p>
            )}
            {node.department && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                {node.department}
              </p>
            )}
          </div>
        </div>
        {node.role_type && (
          <div className="mt-2 flex items-center gap-2">
            <RoleBadge role={node.role_type} />
            {node.influence_score && (
              <span className="text-[10px] text-zinc-500">
                Influence: {node.influence_score}/10
              </span>
            )}
          </div>
        )}
      </div>
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="mt-1 w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}
    </div>
  )
}

function OrgTree({
  nodes,
  onEdit,
  expandedNodes,
  toggleExpand,
  level = 0
}: {
  nodes: OrgNode[]
  onEdit?: (s: Stakeholder) => void
  expandedNodes: Set<string>
  toggleExpand: (id: string) => void
  level?: number
}) {
  if (nodes.length === 0) return null

  return (
    <div className="flex flex-col items-center">
      <div className={`flex flex-wrap justify-center gap-4 ${level > 0 ? 'mt-4' : ''}`}>
        {nodes.map((node, index) => {
          const isExpanded = expandedNodes.has(node.stakeholder_id)
          const hasChildren = node.children.length > 0

          return (
            <div key={node.stakeholder_id} className="flex flex-col items-center">
              {level > 0 && (
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600" />
              )}
              <OrgNodeCard
                node={node}
                onEdit={onEdit}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleExpand(node.stakeholder_id)}
                hasChildren={hasChildren}
              />
              {hasChildren && isExpanded && (
                <>
                  <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600" />
                  {node.children.length > 1 && (
                    <div
                      className="h-px bg-zinc-300 dark:bg-zinc-600"
                      style={{
                        width: `${Math.min(node.children.length * 200, 800)}px`
                      }}
                    />
                  )}
                  <OrgTree
                    nodes={node.children}
                    onEdit={onEdit}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                    level={level + 1}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GapCard({
  gap,
  onAdd
}: {
  gap: OrgGap
  onAdd: () => void
}) {
  const priorityColors = {
    High: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    Medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    Low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('GapCard + button clicked for:', gap.suggested_title)
    onAdd()
  }

  return (
    <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-amber-300 dark:border-amber-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {gap.suggested_title}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityColors[gap.priority]}`}>
              {gap.priority}
            </span>
          </div>
          {gap.department && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {gap.department}
            </p>
          )}
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {gap.why_important}
          </p>
          <div className="mt-1">
            <RoleBadge role={gap.role_type?.replace(/ /g, '_')} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="flex-shrink-0 p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
          title="Add this role"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function OrgChartSection({
  stakeholders,
  onEditStakeholder,
  accountContext,
  pursuits = [],
  accountPlanId,
  onAddStakeholder
}: OrgChartSectionProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    return new Set(stakeholders.map(s => s.stakeholder_id))
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [gaps, setGaps] = useState<OrgGap[]>([])
  const [showGaps, setShowGaps] = useState(false)
  const [gapError, setGapError] = useState<string | null>(null)
  const [addedMessage, setAddedMessage] = useState<string | null>(null)

  const orgTree = buildOrgTree(stakeholders)

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedNodes(new Set(stakeholders.map(s => s.stakeholder_id)))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const analyzeGaps = async () => {
    if (!accountContext?.account_name) {
      setGapError('Account context required for gap analysis')
      return
    }

    setIsAnalyzing(true)
    setGapError(null)

    try {
      const response = await fetch('/api/ai/org-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: accountContext.account_name,
          industry: accountContext.industry,
          employeeCount: accountContext.employee_count,
          stakeholders: stakeholders.map(s => ({
            full_name: s.full_name,
            title: s.title,
            department: s.department,
            role_type: s.role_type,
          })),
          pursuits: pursuits.map(p => ({
            name: p.name,
            description: p.description,
          })),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setGaps(result.gaps || [])
        setShowGaps(true)
      } else {
        setGapError('Failed to analyze gaps')
      }
    } catch (err) {
      console.error('Gap analysis error:', err)
      setGapError('Network error during analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAddGap = async (gap: OrgGap) => {
    console.log('handleAddGap called with:', gap)
    console.log('accountPlanId:', accountPlanId)

    if (!accountPlanId) {
      setGapError('Cannot add stakeholder: missing account plan ID')
      return
    }

    setGapError(null)

    try {
      const payload = {
        account_plan_id: accountPlanId,
        full_name: `TBD - ${gap.suggested_title}`,
        title: gap.suggested_title,
        department: gap.department,
        role_type: gap.role_type?.replace(/ /g, '_'),
        sentiment: 'Unknown',
      }
      console.log('Sending payload:', payload)

      const response = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response body:', result)

      if (response.ok && result.success) {
        // Remove from gaps list - don't reload so user can add multiple
        setGaps(prev => prev.filter(g => g.suggested_title !== gap.suggested_title))
        // Show success message briefly
        setAddedMessage(`Added: ${gap.suggested_title}`)
        setTimeout(() => setAddedMessage(null), 2000)
      } else {
        setGapError(result.error || 'Failed to add stakeholder')
      }
    } catch (err) {
      console.error('Add stakeholder error:', err)
      setGapError('Network error adding stakeholder')
    }
  }

  if (stakeholders.length === 0) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Organization Chart
          </h2>
          {accountContext && (
            <button
              onClick={analyzeGaps}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Identify Key Roles
                </>
              )}
            </button>
          )}
        </div>

        {addedMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {addedMessage}
          </div>
        )}

        {/* Gap suggestions when no stakeholders */}
        {showGaps && gaps.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Suggested Key Stakeholders to Map
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gaps.map((gap, i) => (
                <GapCard key={i} gap={gap} onAdd={() => handleAddGap(gap)} />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">
            No stakeholders to display. Add stakeholders with reporting relationships to see the org chart.
          </p>
        </div>
      </section>
    )
  }

  const hasHierarchy = stakeholders.some(s => s.reports_to_id)

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Organization Chart
        </h2>
        <div className="flex items-center gap-3">
          {accountPlanId && (
            <Link
              href={`/accounts/${accountPlanId}/org-builder`}
              className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Build Org Chart
            </Link>
          )}
          {accountContext && (
            <button
              onClick={analyzeGaps}
              disabled={isAnalyzing}
              className="px-3 py-1.5 text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Identify Gaps
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Expand All
            </button>
            <span className="text-zinc-300 dark:text-zinc-600">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {gapError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {gapError}
        </div>
      )}

      {addedMessage && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {addedMessage}
        </div>
      )}

      {/* Gap Analysis Results */}
      {showGaps && gaps.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coverage Gaps Identified ({gaps.length})
            </h3>
            <button
              onClick={() => setShowGaps(false)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gaps.map((gap, i) => (
              <GapCard key={i} gap={gap} onAdd={() => handleAddGap(gap)} />
            ))}
          </div>
        </div>
      )}

      {showGaps && gaps.length === 0 && !isAnalyzing && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Good coverage! No critical gaps identified in your stakeholder map.
        </div>
      )}

      {!hasHierarchy && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
          No reporting relationships defined. Edit stakeholders to set their &quot;Reports To&quot; field.
        </div>
      )}

      <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 p-6 overflow-x-auto">
        <OrgTree
          nodes={orgTree}
          onEdit={onEditStakeholder}
          expandedNodes={expandedNodes}
          toggleExpand={toggleExpand}
        />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>Advocate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
          <span>Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Opponent</span>
        </div>
      </div>
    </section>
  )
}
