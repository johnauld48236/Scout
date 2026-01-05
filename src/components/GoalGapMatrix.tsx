'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AccountDetailModal } from './AccountDetailModal'

interface Campaign {
  campaign_id: string
  name: string
}

interface GoalWithGap {
  goal_id: string
  name: string
  goal_type: string
  category: string | null
  vertical: string | null
  target_value: number
  current_value: number
  gap_value: number
  progress_percentage: number
  tam_count: number
  tam_value: number
  status: 'achieved' | 'on_track' | 'at_risk' | 'off_track'
}

interface TAMOpportunity {
  tam_account_id: string
  company_name: string
  priority_score: number
  vertical: string
  estimated_deal_value: number
  last_signal_date: string | null
  warm_path_contact: string | null
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function formatValue(value: number, goalType: string): string {
  return goalType === 'revenue' ? formatCurrency(value) : value.toString()
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    achieved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    at_risk: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    off_track: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const labels: Record<string, string> = {
    achieved: 'Achieved',
    on_track: 'On Track',
    at_risk: 'At Risk',
    off_track: 'Off Track',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function ProgressBar({ percentage, status }: { percentage: number; status: string }) {
  const colorClass = status === 'achieved' || status === 'on_track'
    ? 'bg-green-500'
    : status === 'at_risk'
    ? 'bg-yellow-500'
    : 'bg-red-500'

  return (
    <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all ${colorClass}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

function PriorityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                score >= 60 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                'text-zinc-600 bg-zinc-100 dark:bg-zinc-800'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export function GoalGapMatrix({
  goals,
  campaigns,
  goalType,
}: {
  goals: GoalWithGap[]
  campaigns: Campaign[]
  goalType: string
}) {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  const [opportunities, setOpportunities] = useState<TAMOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const handleViewClick = async (goal: GoalWithGap) => {
    if (expandedGoalId === goal.goal_id) {
      setExpandedGoalId(null)
      setOpportunities([])
      return
    }

    setExpandedGoalId(goal.goal_id)
    setLoading(true)

    const supabase = createClient()

    // Fetch TAM accounts matching goal's vertical
    let query = supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name, priority_score, vertical, estimated_deal_value')
      .in('status', ['Qualified', 'Researching', 'Pursuing'])
      .order('priority_score', { ascending: false })

    if (goal.vertical) {
      query = query.eq('vertical', goal.vertical)
    }

    const { data: tamAccounts } = await query

    // Get last signal dates
    const tamIds = tamAccounts?.map(ta => ta.tam_account_id) || []
    const { data: signals } = await supabase
      .from('account_signals')
      .select('tam_account_id, signal_date')
      .in('tam_account_id', tamIds)
      .order('signal_date', { ascending: false })

    // Get warm paths
    const { data: warmPaths } = await supabase
      .from('tam_warm_paths')
      .select('tam_account_id, connection_name')
      .in('tam_account_id', tamIds)

    // Build maps
    const signalMap = new Map<string, string>()
    signals?.forEach(s => {
      if (!signalMap.has(s.tam_account_id)) {
        signalMap.set(s.tam_account_id, s.signal_date)
      }
    })

    const warmPathMap = new Map<string, string>()
    warmPaths?.forEach(wp => {
      if (!warmPathMap.has(wp.tam_account_id)) {
        warmPathMap.set(wp.tam_account_id, wp.connection_name)
      }
    })

    // Combine data
    const opps: TAMOpportunity[] = (tamAccounts || []).map(ta => ({
      ...ta,
      last_signal_date: signalMap.get(ta.tam_account_id) || null,
      warm_path_contact: warmPathMap.get(ta.tam_account_id) || null,
    }))

    setOpportunities(opps)
    setLoading(false)
  }

  return (
    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Goal</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Progress</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Gap</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">TAM Opportunity</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {goals.map((goal) => (
            <Fragment key={goal.goal_id}>
              <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div>
                    <Link
                      href={`/goals/${goal.goal_id}`}
                      className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                    >
                      {goal.name}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {goal.vertical}
                      {goal.category && ` • ${goal.category.replace('_', ' ')}`}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProgressBar percentage={goal.progress_percentage} status={goal.status} />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatValue(goal.current_value, goal.goal_type)} / {formatValue(goal.target_value, goal.goal_type)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${goal.gap_value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {goal.gap_value > 0 ? formatValue(goal.gap_value, goal.goal_type) : 'Met!'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {goal.tam_count > 0 ? (
                    <span>
                      {goal.tam_count} accts ({formatCurrency(goal.tam_value)})
                    </span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={goal.status} />
                </td>
                <td className="px-4 py-3">
                  {goal.tam_count > 0 ? (
                    <button
                      onClick={() => handleViewClick(goal)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        expandedGoalId === goal.goal_id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {expandedGoalId === goal.goal_id ? 'Close' : `View ${goal.tam_count}`}
                    </button>
                  ) : (
                    <span className="text-zinc-400 text-sm">-</span>
                  )}
                </td>
              </tr>

              {/* Expanded Opportunities Panel */}
              {expandedGoalId === goal.goal_id && (
                <tr key={`${goal.goal_id}-expanded`}>
                  <td colSpan={6} className="px-4 py-4 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        TAM accounts for: {goal.name} ({opportunities.length} accounts, {formatCurrency(goal.tam_value)} potential)
                      </p>
                      {goal.gap_value > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Gap coverage: {Math.round((goal.tam_value / goal.gap_value) * 100)}% of gap could be filled
                        </p>
                      )}
                    </div>

                    {loading ? (
                      <div className="text-center py-8 text-zinc-500">Loading opportunities...</div>
                    ) : opportunities.length > 0 ? (
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <table className="w-full bg-white dark:bg-zinc-900">
                          <thead className="bg-zinc-100 dark:bg-zinc-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Company</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Score</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Est. Value</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Last Signal</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Warm Path</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {opportunities.map((opp, index) => (
                              <tr key={opp.tam_account_id || index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => setSelectedAccountId(opp.tam_account_id)}
                                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 text-left"
                                  >
                                    {opp.company_name}
                                  </button>
                                </td>
                                <td className="px-3 py-2">
                                  <PriorityBadge score={opp.priority_score || 0} />
                                </td>
                                <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  {formatCurrency(opp.estimated_deal_value || 0)}
                                </td>
                                <td className="px-3 py-2 text-sm text-zinc-500">
                                  {formatRelativeTime(opp.last_signal_date)}
                                </td>
                                <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                                  {opp.warm_path_contact || '-'}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => setSelectedAccountId(opp.tam_account_id)}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded transition-colors"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500">
                        No TAM accounts match this goal&apos;s criteria
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* Account Detail Modal */}
      {selectedAccountId && (
        <AccountDetailModal
          tamAccountId={selectedAccountId}
          campaigns={campaigns}
          onClose={() => setSelectedAccountId(null)}
        />
      )}
    </div>
  )
}
