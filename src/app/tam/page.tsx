import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { IntelligenceScanButton } from '@/components/tam/IntelligenceScanButton'

function PriorityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                score >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {score}
    </span>
  )
}

function SignalTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'Regulatory_Action': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Leadership_Change': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Product_Launch': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Security_Incident': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Partnership': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Funding_Round': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'MA_Activity': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Hiring_Surge': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }
  const displayName = type?.replace(/_/g, ' ') || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-zinc-100 text-zinc-600'}`}>
      {displayName}
    </span>
  )
}

function IntelSignalTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'regulatory_action': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'security_incident': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'hiring': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'news_mention': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'compliance_issue': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }
  const displayName = type?.replace(/_/g, ' ') || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] || 'bg-zinc-100 text-zinc-600'}`}>
      {displayName}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = confidence === 'high' ? 'text-green-600 dark:text-green-400' :
                confidence === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-zinc-500 dark:text-zinc-400'
  return (
    <span className={`text-xs ${color}`}>
      {confidence}
    </span>
  )
}

export default async function TAMOverviewPage() {
  const supabase = await createClient()

  // Fetch data
  const [tamAccountsRes, signalsRes, warmPathsRes, campaignsRes, gapDefsRes, pursuitsRes, intelSignalsRes] = await Promise.all([
    supabase.from('tam_accounts').select('*').in('status', ['Qualified', 'Researching', 'Pursuing']).order('priority_score', { ascending: false }),
    supabase.from('account_signals').select('*, tam_accounts(tam_account_id, company_name)').order('signal_date', { ascending: false }).limit(15),
    supabase.from('tam_warm_paths').select('tam_account_id'),
    supabase.from('campaigns').select('campaign_id, name').eq('status', 'active'),
    supabase.from('gap_definitions').select('*').eq('is_active', true),
    supabase.from('pursuits').select('pursuit_id, stage, estimated_value, confirmed_value, account_plans(campaign_id)'),
    supabase.from('intelligence_signals').select('*, tam_accounts(tam_account_id, company_name)').eq('is_dismissed', false).order('created_at', { ascending: false }).limit(20),
  ])

  const tamAccounts = tamAccountsRes.data || []
  const signals = signalsRes.data || []
  const warmPaths = warmPathsRes.data || []
  const campaigns = campaignsRes.data || []
  const gapDefs = gapDefsRes.data || []
  const pursuits = pursuitsRes.data || []
  const intelligenceSignals = intelSignalsRes.data || []

  // Calculate metrics
  const totalTAM = tamAccounts.length
  const recentSignals = signals.filter(s => {
    const signalDate = new Date(s.signal_date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return signalDate >= weekAgo
  }).length
  const readyForOutreach = tamAccounts.filter(t => t.priority_score >= 70).length

  // Get warm path counts per TAM account
  const warmPathCounts = warmPaths.reduce((acc, wp) => {
    acc[wp.tam_account_id] = (acc[wp.tam_account_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate signal boost from intelligence signals
  const signalBoosts = intelligenceSignals.reduce((acc, signal) => {
    if (signal.tam_account_id) {
      const confidenceBoost = signal.confidence === 'high' ? 15 : signal.confidence === 'medium' ? 10 : 5
      const existingBoost = acc[signal.tam_account_id] || { boost: 0, count: 0, highConfCount: 0 }
      acc[signal.tam_account_id] = {
        boost: Math.min(existingBoost.boost + confidenceBoost, 30), // Cap at 30 points
        count: existingBoost.count + 1,
        highConfCount: existingBoost.highConfCount + (signal.confidence === 'high' ? 1 : 0),
      }
    }
    return acc
  }, {} as Record<string, { boost: number; count: number; highConfCount: number }>)

  // Priority queue - accounts with signal-boosted scores
  const priorityQueueWithBoost = tamAccounts.map(account => {
    const signalData = signalBoosts[account.tam_account_id] || { boost: 0, count: 0, highConfCount: 0 }
    return {
      ...account,
      warmPathCount: warmPathCounts[account.tam_account_id] || 0,
      lastSignal: signals.find(s => s.tam_accounts?.tam_account_id === account.tam_account_id),
      signalBoost: signalData.boost,
      signalMatchCount: signalData.count,
      highConfSignals: signalData.highConfCount,
      boostedScore: account.priority_score + signalData.boost,
    }
  })

  // Sort by boosted score and take top 15
  const priorityQueue = priorityQueueWithBoost
    .sort((a, b) => b.boostedScore - a.boostedScore)
    .slice(0, 15)

  // Simple gap analysis
  const gapAlerts = gapDefs.slice(0, 3).map(gap => {
    const matchingPursuits = pursuits.filter(p => {
      if (gap.campaign_id) {
        return (p.account_plans as { campaign_id?: string })?.campaign_id === gap.campaign_id
      }
      return true
    })
    const matchingTAM = tamAccounts.filter(t => {
      if (gap.vertical && t.vertical !== gap.vertical) return false
      if (gap.value_min && (t.estimated_deal_value || 0) < gap.value_min) return false
      if (gap.value_max && (t.estimated_deal_value || 0) > gap.value_max) return false
      return true
    })
    const highPriorityTAM = matchingTAM.filter(t => t.priority_score >= 70).length

    return {
      ...gap,
      pursuitCount: matchingPursuits.length,
      tamCount: matchingTAM.length,
      highPriorityCount: highPriorityTAM,
      isGap: matchingPursuits.length < (gap.min_pursuits_for_coverage || 2) && matchingTAM.length >= (gap.min_tam_for_opportunity || 5),
    }
  }).filter(g => g.isGap)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">TAM Intelligence</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Priority accounts and prospecting signals</p>
        </div>
        <div className="flex items-center gap-3">
          <IntelligenceScanButton />
          <Link
            href="/tam/list"
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            View Full List
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total TAM</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{totalTAM}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Campaigns</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{campaigns.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Signals This Week</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{recentSignals}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ready for Outreach</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{readyForOutreach}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-8">
        {/* Left Column - Priority Queue */}
        <div className="col-span-3 space-y-6">
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Priority Queue ({readyForOutreach} ready)
              </h2>
              <Link href="/tam/list?min_priority=70" className="text-sm text-blue-600 hover:text-blue-700">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {priorityQueue.map((account) => (
                <Link
                  key={account.tam_account_id}
                  href={`/tam/${account.tam_account_id}`}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border ${
                    account.signalBoost > 0
                      ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10'
                      : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{account.company_name}</p>
                      <PriorityBadge score={account.boostedScore} />
                      {account.signalBoost > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          +{account.signalBoost}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {account.vertical} • ${(account.estimated_deal_value || 0).toLocaleString()}
                      {account.signalMatchCount > 0 && (
                        <span className="ml-2 text-indigo-600 dark:text-indigo-400">
                          • {account.signalMatchCount} signal{account.signalMatchCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {account.lastSignal && (
                      <div className="text-right">
                        <SignalTypeBadge type={account.lastSignal.signal_type} />
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {new Date(account.lastSignal.signal_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {account.warmPathCount > 0 && (
                      <div className="flex items-center gap-1 text-zinc-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        <span>{account.warmPathCount}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              {priorityQueue.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-8">No TAM accounts yet</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="col-span-2 space-y-6">
          {/* Gap Alerts */}
          {gapAlerts.length > 0 && (
            <section className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-5">
              <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Pipeline Gaps</h2>
              <div className="space-y-3">
                {gapAlerts.map((gap) => (
                  <div key={gap.id} className="p-3 bg-white dark:bg-zinc-900 rounded-lg">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{gap.name}</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      {gap.pursuitCount} pursuits • {gap.tamCount} TAM accounts • {gap.highPriorityCount} high priority
                    </p>
                    <Link
                      href={`/tam/list?vertical=${gap.vertical || ''}&min_value=${gap.value_min || ''}`}
                      className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
                    >
                      View opportunities →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Intelligence Signals (from AI Scan) */}
          {intelligenceSignals.length > 0 && (
            <section className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">
                  Intelligence Signals ({intelligenceSignals.length})
                </h2>
                <span className="text-xs text-indigo-600 dark:text-indigo-400">AI-Generated</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {intelligenceSignals.slice(0, 10).map((signal) => (
                  <div
                    key={signal.signal_id}
                    className={`p-3 rounded-lg ${
                      signal.tam_account_id
                        ? 'bg-white dark:bg-zinc-900 border-l-4 border-green-500'
                        : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IntelSignalTypeBadge type={signal.signal_type} />
                      <ConfidenceBadge confidence={signal.confidence} />
                      {signal.signal_date && (
                        <span className="text-xs text-zinc-500">{new Date(signal.signal_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{signal.title}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">{signal.summary}</p>
                    {signal.regulations_matched && signal.regulations_matched.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {signal.regulations_matched.slice(0, 3).map((reg: string) => (
                          <span key={reg} className="px-1.5 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                            {reg}
                          </span>
                        ))}
                      </div>
                    )}
                    {signal.tam_account_id && signal.tam_accounts && (
                      <Link
                        href={`/tam/${signal.tam_account_id}`}
                        className="text-xs text-green-600 hover:text-green-700 mt-2 inline-flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Matched: {signal.tam_accounts.company_name}
                      </Link>
                    )}
                    {signal.company_mentioned && !signal.tam_account_id && (
                      <p className="text-xs text-zinc-500 mt-2">
                        Company: {signal.company_mentioned} (not in TAM)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Signals */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Latest Signals</h2>
            <div className="space-y-3">
              {signals.slice(0, 8).map((signal, index) => (
                <Link
                  key={signal.signal_id || index}
                  href={`/tam/${signal.tam_account_id}`}
                  className="block border-l-2 border-blue-500 pl-3 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 -ml-3 -mr-3 px-3 rounded-r transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SignalTypeBadge type={signal.signal_type} />
                    <span className="text-xs text-zinc-500">{new Date(signal.signal_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {signal.tam_accounts?.company_name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{signal.summary}</p>
                </Link>
              ))}
              {signals.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No signals yet</p>
              )}
            </div>
          </section>

          {/* Campaign Filter */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Filter by Campaign</h2>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.campaign_id}
                  href={`/tam/list?campaign=${campaign.campaign_id}`}
                  className="block p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</p>
                </Link>
              ))}
              {campaigns.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No active campaigns</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
