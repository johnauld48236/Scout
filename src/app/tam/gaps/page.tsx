import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { GoalGapMatrix } from '@/components/GoalGapMatrix'
import { GoalsProgress } from '@/components/dashboard/GoalsProgress'

interface Goal {
  goal_id: string
  name: string
  goal_type: string
  category: string | null
  vertical: string | null
  target_value: number
  current_value: number
  parent_goal_id: string | null
}

interface GoalWithGap extends Goal {
  gap_value: number
  progress_percentage: number
  tam_count: number
  tam_value: number
  status: 'achieved' | 'on_track' | 'at_risk' | 'off_track'
}

export default async function GapAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const goalTypeFilter = params.type || 'revenue'
  const supabase = await createClient()

  // Fetch goals (leaf nodes only - those with verticals or no children)
  const { data: allGoals } = await supabase
    .from('goals')
    .select('*')
    .eq('is_active', true)
    .eq('target_year', 2026)
    .order('name')

  // Fetch all active TAM accounts
  const { data: tamAccounts } = await supabase
    .from('tam_accounts')
    .select('tam_account_id, vertical, estimated_deal_value, priority_score, company_name')
    .in('status', ['Qualified', 'Researching', 'Pursuing'])

  // Fetch campaigns with linked goals and context
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      campaign_id,
      name,
      status,
      type,
      target_verticals,
      pipeline_goal,
      key_pain_points,
      value_proposition,
      regulatory_context,
      campaign_goals(
        goal_id,
        allocation_type,
        allocated_value,
        goals(name, target_value, current_value)
      )
    `)
    .in('status', ['active', 'planned'])
    .order('name')

  // Fetch pursuits to calculate campaign pipeline
  const { data: pursuits } = await supabase
    .from('pursuits')
    .select('pursuit_id, estimated_value, confirmed_value, account_plans!inner(campaign_id)')

  // Calculate campaign metrics
  const campaignsWithMetrics = (campaigns || []).map(campaign => {
    const linkedGoals = campaign.campaign_goals || []
    const campaignPursuits = (pursuits || []).filter(
      (p: { account_plans: { campaign_id: string }[] }) => p.account_plans?.[0]?.campaign_id === campaign.campaign_id
    )
    const pipelineValue = campaignPursuits.reduce(
      (sum: number, p: { confirmed_value?: number; estimated_value?: number }) =>
        sum + (p.confirmed_value || p.estimated_value || 0),
      0
    )

    return {
      ...campaign,
      linkedGoalCount: linkedGoals.length,
      pipelineValue,
      pipelineProgress: campaign.pipeline_goal
        ? Math.round((pipelineValue / campaign.pipeline_goal) * 100)
        : null,
    }
  })

  // Get leaf goals for GoalsProgress component (goals with categories/verticals)
  const leafGoals = (allGoals || []).filter(g => g.category !== null || g.vertical !== null)

  // Filter to actionable goals (those with verticals that can be matched to TAM)
  const actionableGoals = (allGoals || []).filter(g =>
    g.goal_type === goalTypeFilter && g.vertical !== null
  )

  // Calculate gap analysis for each goal
  const goalsWithGaps: GoalWithGap[] = actionableGoals.map(goal => {
    const gapValue = Math.max(0, goal.target_value - goal.current_value)
    const progressPercentage = goal.target_value > 0
      ? Math.round((goal.current_value / goal.target_value) * 100)
      : 0

    // Find TAM accounts matching this goal's vertical
    const matchingTam = (tamAccounts || []).filter(ta =>
      ta.vertical === goal.vertical
    )

    const tamCount = matchingTam.length
    const tamValue = matchingTam.reduce((sum, ta) => sum + (ta.estimated_deal_value || 0), 0)

    // Determine status
    let status: 'achieved' | 'on_track' | 'at_risk' | 'off_track' = 'off_track'
    if (progressPercentage >= 100) status = 'achieved'
    else if (progressPercentage >= 70) status = 'on_track'
    else if (progressPercentage >= 40) status = 'at_risk'

    return {
      ...goal,
      gap_value: gapValue,
      progress_percentage: progressPercentage,
      tam_count: tamCount,
      tam_value: tamValue,
      status,
    }
  })

  // Sort by gap (largest gaps first)
  goalsWithGaps.sort((a, b) => b.gap_value - a.gap_value)

  // Calculate summary metrics
  const totalGap = goalsWithGaps.reduce((sum, g) => sum + g.gap_value, 0)
  const totalTamOpportunity = goalsWithGaps.reduce((sum, g) => sum + g.tam_value, 0)
  const offTrackCount = goalsWithGaps.filter(g => g.status === 'off_track' || g.status === 'at_risk').length
  const onTrackCount = goalsWithGaps.filter(g => g.status === 'on_track' || g.status === 'achieved').length

  function formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gap Analysis</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Goal achievement vs. TAM opportunity</p>
        </div>

        {/* Goal Type Filter */}
        <div className="flex items-center gap-2">
          <Link
            href="/tam/gaps?type=revenue"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              goalTypeFilter === 'revenue'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            Revenue
          </Link>
          <Link
            href="/tam/gaps?type=logos"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              goalTypeFilter === 'logos'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            New Logos
          </Link>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Gap</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {goalTypeFilter === 'revenue' ? formatCurrency(totalGap) : totalGap}
          </p>
          <p className="text-xs text-zinc-500 mt-1">to reach targets</p>
        </div>
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400">TAM Opportunity</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
            {formatCurrency(totalTamOpportunity)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">available to pursue</p>
        </div>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Needs Attention</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">{offTrackCount}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">goals at risk or off track</p>
        </div>
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-600 dark:text-green-400">On Track</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{onTrackCount}</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">goals on track or achieved</p>
        </div>
      </div>

      {/* Goal Gap Matrix */}
      {goalsWithGaps.length > 0 ? (
        <GoalGapMatrix goals={goalsWithGaps} campaigns={campaigns || []} goalType={goalTypeFilter} />
      ) : (
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">No goals with verticals configured for {goalTypeFilter}</p>
          <Link href="/goals" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
            Go to Goals →
          </Link>
        </div>
      )}

      {/* All On Track Message */}
      {goalsWithGaps.length > 0 && offTrackCount === 0 && (
        <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
          <p className="text-green-700 dark:text-green-300 font-medium">
            All {goalTypeFilter} goals are on track!
          </p>
        </div>
      )}

      {/* Goals Progress Section */}
      {leafGoals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Goals & Progress</h2>
          <GoalsProgress goals={leafGoals} />
        </div>
      )}

      {/* Active Campaigns Section */}
      {campaignsWithMetrics.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Active Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignsWithMetrics.map(campaign => (
              <Link
                key={campaign.campaign_id}
                href={`/campaigns/${campaign.campaign_id}`}
                className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        campaign.type === 'vertical'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {campaign.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  {campaign.linkedGoalCount > 0 && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {campaign.linkedGoalCount} goal{campaign.linkedGoalCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Value Proposition */}
                {campaign.value_proposition && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                    {campaign.value_proposition}
                  </p>
                )}

                {/* Key Pain Points */}
                {campaign.key_pain_points && (
                  <div className="mb-2">
                    <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-1">Pain Points</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {campaign.key_pain_points}
                    </p>
                  </div>
                )}

                {/* Regulatory Context */}
                {campaign.regulatory_context && (
                  <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                      {campaign.regulatory_context.length > 30
                        ? campaign.regulatory_context.substring(0, 30) + '...'
                        : campaign.regulatory_context}
                    </span>
                  </div>
                )}

                {/* Verticals */}
                {campaign.target_verticals && campaign.target_verticals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {campaign.target_verticals.slice(0, 3).map((v: string) => (
                      <span key={v} className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                        {v}
                      </span>
                    ))}
                    {campaign.target_verticals.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-zinc-500">+{campaign.target_verticals.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Pipeline Progress */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Pipeline</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(campaign.pipelineValue)}
                    </span>
                  </div>
                  {campaign.pipeline_goal && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (campaign.pipelineProgress || 0) >= 70 ? 'bg-green-500' :
                            (campaign.pipelineProgress || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(campaign.pipelineProgress || 0, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {campaign.pipelineProgress}% of {formatCurrency(campaign.pipeline_goal)} goal
                      </p>
                    </div>
                  )}
                </div>

                {/* Linked Goals Warning */}
                {campaign.linkedGoalCount === 0 && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    No goals linked to this campaign
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
