'use client'

import { useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AccountDetailModal } from './AccountDetailModal'

interface Campaign {
  campaign_id: string
  name: string
}

interface GapAnalysis {
  id: string
  name: string
  vertical: string | null
  value_min: number | null
  value_max: number | null
  campaign_id: string | null
  min_pursuits_for_coverage: number
  min_tam_for_opportunity: number
  pursuit_count: number
  pursuit_value: number
  tam_count: number
  gap_score: 'HIGH' | 'MEDIUM' | 'LOW' | 'COVERED'
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

function GapScoreBadge({ score }: { score: string }) {
  const styles: Record<string, string> = {
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    LOW: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    COVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[score] || styles.LOW}`}>
      {score}
    </span>
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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value}`
}

export function GapMatrix({ gaps, campaigns }: { gaps: GapAnalysis[]; campaigns: Campaign[] }) {
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null)
  const [opportunities, setOpportunities] = useState<TAMOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  const handleViewClick = async (gap: GapAnalysis) => {
    if (expandedGapId === gap.id) {
      setExpandedGapId(null)
      setOpportunities([])
      return
    }

    setExpandedGapId(gap.id)
    setLoading(true)

    const supabase = createClient()

    // Build query for matching TAM accounts
    let query = supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name, priority_score, vertical, estimated_deal_value')
      .in('status', ['Qualified', 'Researching', 'Pursuing'])
      .order('priority_score', { ascending: false })

    // Apply vertical filter
    if (gap.vertical) {
      query = query.eq('vertical', gap.vertical)
    }

    // Apply value filters
    if (gap.value_min) {
      query = query.gte('estimated_deal_value', gap.value_min)
    }
    if (gap.value_max) {
      query = query.lte('estimated_deal_value', gap.value_max)
    }

    const { data: tamAccounts } = await query

    // If campaign filter, get matching TAM accounts
    let filteredAccounts = tamAccounts || []
    if (gap.campaign_id && filteredAccounts.length > 0) {
      const { data: campaignTam } = await supabase
        .from('campaign_tam_accounts')
        .select('tam_account_id')
        .eq('campaign_id', gap.campaign_id)

      const campaignTamIds = new Set(campaignTam?.map(ct => ct.tam_account_id) || [])
      filteredAccounts = filteredAccounts.filter(ta => campaignTamIds.has(ta.tam_account_id))
    }

    // Get last signal dates
    const tamIds = filteredAccounts.map(ta => ta.tam_account_id)
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

    // Build signal date map (latest per account)
    const signalMap = new Map<string, string>()
    signals?.forEach(s => {
      if (!signalMap.has(s.tam_account_id)) {
        signalMap.set(s.tam_account_id, s.signal_date)
      }
    })

    // Build warm path map (first per account)
    const warmPathMap = new Map<string, string>()
    warmPaths?.forEach(wp => {
      if (!warmPathMap.has(wp.tam_account_id)) {
        warmPathMap.set(wp.tam_account_id, wp.connection_name)
      }
    })

    // Combine data
    const opps: TAMOpportunity[] = filteredAccounts.map(ta => ({
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
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Segment</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Pipeline</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">TAM Available</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Gap Score</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {gaps.map((gap) => (
            <Fragment key={gap.id}>
              <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{gap.name}</p>
                    <p className="text-xs text-zinc-500">
                      {gap.vertical || 'All verticals'}
                      {gap.value_min && ` • >${formatCurrency(gap.value_min)}`}
                      {gap.value_max && ` • <${formatCurrency(gap.value_max)}`}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {gap.pursuit_count > 0 ? (
                    <span>{gap.pursuit_count} ({formatCurrency(gap.pursuit_value)})</span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {gap.tam_count > 0 ? (
                    <span>{gap.tam_count} accts</span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <GapScoreBadge score={gap.gap_score} />
                </td>
                <td className="px-4 py-3">
                  {gap.tam_count > 0 ? (
                    <button
                      onClick={() => handleViewClick(gap)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        expandedGapId === gap.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {expandedGapId === gap.id ? 'Close' : `View ${gap.tam_count}`}
                    </button>
                  ) : (
                    <span className="text-zinc-400 text-sm">-</span>
                  )}
                </td>
              </tr>

              {/* Expanded Opportunities Panel */}
              {expandedGapId === gap.id && (
                <tr key={`${gap.id}-expanded`}>
                  <td colSpan={5} className="px-4 py-4 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Showing: {gap.name} ({opportunities.length} TAM accounts)
                      </p>
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
                        No TAM accounts match this segment criteria
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
