import { createClient } from '@/lib/supabase/server'
import { ARRGoalHero } from '@/components/dashboard/ARRGoalHero'
import { IntelligenceSummary } from '@/components/dashboard/IntelligenceSummary'
import { AttentionRequired } from '@/components/dashboard/AttentionRequired'
import { GoalsProgress } from '@/components/dashboard/GoalsProgress'
import { ScoutActivityLayer } from '@/components/dashboard/ScoutActivityLayer'
import { ScoutHealthMetrics } from '@/components/dashboard/ScoutHealthMetrics'
import { CollapsibleSection, CompactARRSummary } from '@/components/dashboard/CollapsibleSection'
import type { HealthBand } from '@/lib/scoring/health-score'

const STAGE_PROBABILITIES: Record<string, number> = {
  Discovery: 0.1,
  Qualification: 0.25,
  Proposal: 0.5,
  Negotiation: 0.75,
}

export default async function Dashboard() {
  const supabase = await createClient()

  // Parallel fetch all data
  const [
    goalsRes,
    pursuitsRes,
    accountPlansRes,
    actionsRes,
    tamAccountsRes,
    signalsRes,
  ] = await Promise.all([
    // Goals for 2026
    supabase
      .from('goals')
      .select('*')
      .eq('is_active', true)
      .eq('target_year', 2026)
      .order('parent_goal_id', { ascending: true, nullsFirst: true }),

    // All pursuits
    supabase
      .from('pursuits')
      .select('*, account_plans!inner(account_plan_id, account_name, vertical)')
      .order('updated_at', { ascending: false }),

    // Account plans with health data
    supabase
      .from('account_plans')
      .select(`
        account_plan_id,
        account_name,
        updated_at,
        stakeholders(count),
        pursuits(count),
        action_items(status, due_date)
      `),

    // Overdue actions
    supabase
      .from('action_items')
      .select('*, account_plans(account_name, account_plan_id), pursuits(name, pursuit_id)')
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date'),

    // TAM accounts
    supabase
      .from('tam_accounts')
      .select('tam_account_id, priority_score, estimated_deal_value, fit_tier')
      .in('status', ['Qualified', 'Researching', 'Pursuing', 'Prospecting', 'New']),

    // Recent signals
    supabase
      .from('account_signals')
      .select('signal_id, signal_date')
      .gte('signal_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

    // Spark metrics (from view)
    supabase.from('spark_metrics').select('*').single(),

    // Health distribution (from view)
    supabase.from('health_distribution').select('*'),
  ])

  const goals = goalsRes.data || []
  const pursuits = pursuitsRes.data || []
  const accountPlans = accountPlansRes.data || []
  const overdueActions = actionsRes.data || []
  const tamAccounts = tamAccountsRes.data || []
  const recentSignals = signalsRes.data || []

  // Spark metrics and health distribution (may not exist until migration runs)
  const sparkMetricsRes = await supabase.from('spark_metrics').select('*').single()
  const healthDistRes = await supabase.from('health_distribution').select('*')

  // Build spark metrics object (with defaults if view doesn't exist)
  const sparkMetrics = sparkMetricsRes.data ? {
    sparksActive: sparkMetricsRes.data.sparks_active || 0,
    sparksConverted: sparkMetricsRes.data.sparks_converted || 0,
    sparksLinked: sparkMetricsRes.data.sparks_linked || 0,
    pipelineCreated: sparkMetricsRes.data.pipeline_created || 0,
    pipelineEnriched: sparkMetricsRes.data.pipeline_enriched || 0,
    totalPipelineValue: sparkMetricsRes.data.total_pipeline_value || 0,
    coveredDealsCount: sparkMetricsRes.data.covered_deals_count || 0,
    totalDealsCount: sparkMetricsRes.data.total_deals_count || 0,
    tamAccountsAvailable: sparkMetricsRes.data.tam_accounts_available || 0,
    tamAccountsEnriched: sparkMetricsRes.data.tam_accounts_enriched || 0,
    tamAccountsTotal: sparkMetricsRes.data.tam_accounts_total || 0,
  } : {
    sparksActive: 0,
    sparksConverted: 0,
    sparksLinked: 0,
    pipelineCreated: 0,
    pipelineEnriched: 0,
    totalPipelineValue: 0,
    coveredDealsCount: 0,
    totalDealsCount: 0,
    tamAccountsAvailable: tamAccounts.length,
    tamAccountsEnriched: 0,
    tamAccountsTotal: tamAccounts.length,
  }

  // Build health distribution (with defaults)
  const healthDistribution: Record<HealthBand, number> = {
    healthy: 0,
    monitor: 0,
    at_risk: 0,
    critical: 0,
  }
  healthDistRes.data?.forEach((row: { health_band: string; count: number }) => {
    if (row.health_band in healthDistribution) {
      healthDistribution[row.health_band as HealthBand] = row.count
    }
  })

  // ==========================================
  // ARR GOAL HERO DATA
  // ==========================================
  // Active pursuits = NOT closed (for pipeline view)
  // BUT recurring deals are baseline ARR, not real "wins" - include them separately
  const activePursuits = pursuits.filter(p =>
    p.stage !== 'Closed_Won' && p.stage !== 'Closed_Lost'
  )

  // Recurring deals are marked as Closed_Won in spreadsheet ("Win" stage) but they're baseline ARR
  const recurringPursuits = pursuits.filter(p => {
    const pt = p.pursuit_type?.toLowerCase()
    return pt === 'recurring'
  })

  // Real closed won deals (excluding recurring baseline ARR)
  const closedWonPursuits = pursuits.filter(p =>
    p.stage === 'Closed_Won' && p.pursuit_type?.toLowerCase() !== 'recurring'
  )
  const closedWonValue = closedWonPursuits.reduce((sum, p) =>
    sum + (p.confirmed_value || p.estimated_value || 0), 0)

  // Get ARR target from primary revenue goal
  const primaryGoal = goals.find(g => g.parent_goal_id === null && g.goal_type === 'revenue')
  const arrTarget = primaryGoal?.target_value || 0

  const categoryGoals = goals.filter(g =>
    g.parent_goal_id === primaryGoal?.goal_id && g.category !== null
  )

  // Helper to get deal type from pursuit_type (maps spreadsheet Deal Type column)
  const getDealType = (p: typeof pursuits[0]) => {
    if (!p.pursuit_type) return 'new_business'
    const pt = p.pursuit_type.toLowerCase()
    if (pt === 'recurring') return 'recurring'
    if (pt === 'renewal') return 'renewal'
    if (pt === 'upsell') return 'upsell'
    return 'new_business' // PoC, Pilot, New Business
  }

  // Get weighted value - use stored value from Column P (Weighted Amount Conservative)
  const getWeightedValue = (p: typeof pursuits[0]) => {
    return p.weighted_value || 0
  }

  // Recurring weighted (baseline ARR from spreadsheet)
  const recurringWeightedValue = recurringPursuits.reduce((sum, p) => sum + getWeightedValue(p), 0)
  const recurringPipelineValue = recurringPursuits.reduce((sum, p) => sum + (p.estimated_value || 0), 0)

  // Total pipeline (unweighted - Column K Total Amount) - includes recurring
  const totalPipeline = activePursuits.reduce((sum, p) => {
    return sum + (p.confirmed_value || p.estimated_value || 0)
  }, 0) + recurringPipelineValue

  // Total weighted pipeline (Column P - Weighted Amount Conservative) - includes recurring
  const totalWeightedPipeline = activePursuits.reduce((sum, p) => {
    return sum + getWeightedValue(p)
  }, 0) + recurringWeightedValue

  // Pipeline by stage (with weighted values)
  const pipelineByStage = activePursuits.reduce((acc, p) => {
    const stage = p.stage || 'Discovery'
    const value = p.confirmed_value || p.estimated_value || 0
    const weighted = getWeightedValue(p)
    if (!acc[stage]) acc[stage] = { value: 0, count: 0, weightedValue: 0 }
    acc[stage].value += value
    acc[stage].weightedValue += weighted
    acc[stage].count++
    return acc
  }, {} as Record<string, { value: number; count: number; weightedValue: number }>)

  const stageData = (Object.entries(pipelineByStage) as [string, { value: number; count: number; weightedValue: number }][])
    .map(([stage, data]) => ({
      stage,
      value: data.value,
      count: data.count,
      weightedValue: data.weightedValue
    }))

  // Group pursuits by deal_type with stage breakdown
  type StageBreakdown = { stage: string; value: number; count: number; weightedValue: number }
  type TypeData = {
    pipeline: number
    weighted: number
    count: number
    byStage: Record<string, { value: number; count: number; weightedValue: number }>
  }

  const pursuitsByType = activePursuits.reduce((acc, p) => {
    const type = getDealType(p)
    const stage = p.stage || 'Discovery'
    const value = p.confirmed_value || p.estimated_value || 0
    const weighted = getWeightedValue(p)

    if (!acc[type]) acc[type] = { pipeline: 0, weighted: 0, count: 0, byStage: {} }
    acc[type].pipeline += value
    acc[type].weighted += weighted
    acc[type].count++

    if (!acc[type].byStage[stage]) acc[type].byStage[stage] = { value: 0, count: 0, weightedValue: 0 }
    acc[type].byStage[stage].value += value
    acc[type].byStage[stage].weightedValue += weighted
    acc[type].byStage[stage].count++

    return acc
  }, {} as Record<string, TypeData>)

  // Closed by type
  const closedByType = closedWonPursuits.reduce((acc, p) => {
    const type = getDealType(p)
    acc[type] = (acc[type] || 0) + (p.confirmed_value || p.estimated_value || 0)
    return acc
  }, {} as Record<string, number>)

  // Renewals confirmed = high probability renewals (Negotiation stage or 70%+ probability)
  const renewalsConfirmed = activePursuits
    .filter(p => getDealType(p) === 'renewal' && (p.stage === 'Negotiation' || (p.probability || 0) >= 70))
    .reduce((sum, p) => sum + (p.confirmed_value || p.estimated_value || 0), 0)

  // Build category data with stage breakdown
  const buildStageArray = (byStage: Record<string, { value: number; count: number; weightedValue: number }> | undefined): StageBreakdown[] => {
    if (!byStage) return []
    return Object.entries(byStage).map(([stage, data]) => ({
      stage,
      value: data.value,
      count: data.count,
      weightedValue: data.weightedValue
    }))
  }

  // arrCategories uses the recurringPursuits already calculated above
  const arrCategories = [
    {
      name: 'recurring',
      label: 'Recurring',
      target: 0, // Recurring is baseline, not a target
      closed: 0,
      totalPipeline: recurringPipelineValue,
      weightedPipeline: recurringWeightedValue,
      dealCount: recurringPursuits.length,
      byStage: [] // Recurring is all "win" stage
    },
    {
      name: 'upsell',
      label: 'Upsell',
      target: categoryGoals.find(g => g.category === 'upsell')?.target_value || 0,
      closed: closedByType['upsell'] || 0,
      totalPipeline: pursuitsByType['upsell']?.pipeline || 0,
      weightedPipeline: pursuitsByType['upsell']?.weighted || 0,
      dealCount: pursuitsByType['upsell']?.count || 0,
      byStage: buildStageArray(pursuitsByType['upsell']?.byStage)
    },
    {
      name: 'new_business',
      label: 'New Business',
      target: categoryGoals.find(g => g.category === 'new_arr')?.target_value || 0,
      closed: closedByType['new_business'] || 0,
      totalPipeline: pursuitsByType['new_business']?.pipeline || 0,
      weightedPipeline: pursuitsByType['new_business']?.weighted || 0,
      dealCount: pursuitsByType['new_business']?.count || 0,
      byStage: buildStageArray(pursuitsByType['new_business']?.byStage)
    }
  ]

  // ==========================================
  // INTELLIGENCE SUMMARY
  // ==========================================
  const highPriorityTam = tamAccounts.filter(t => t.priority_score >= 70).length
  const estimatedOpportunity = tamAccounts.reduce((sum, t) =>
    sum + (t.estimated_deal_value || 0), 0)

  // Account plan health
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const stalePlans = accountPlans.filter(p => {
    const updatedAt = p.updated_at ? new Date(p.updated_at) : null
    return updatedAt && updatedAt < fourteenDaysAgo
  })

  const plansNeedingAttention = accountPlans.filter(p => {
    const updatedAt = p.updated_at ? new Date(p.updated_at) : null
    return updatedAt && updatedAt < sevenDaysAgo && updatedAt >= fourteenDaysAgo
  })

  const openPursuitCount = activePursuits.length

  // Gaps for intelligence summary
  const newBusinessGap = Math.max(0,
    (categoryGoals.find(g => g.category === 'new_arr')?.target_value || 0) -
    (closedByType['new_business'] || 0)
  )

  const upsellGap = Math.max(0,
    (categoryGoals.find(g => g.category === 'upsell')?.target_value || 0) +
    (categoryGoals.find(g => g.category === 'renewal')?.target_value || 0) -
    (closedByType['upsell'] || 0) -
    (closedByType['renewal'] || 0)
  )

  // ==========================================
  // ATTENTION REQUIRED
  // ==========================================
  const stalledDeals = activePursuits.filter(p => {
    const updatedAt = p.updated_at ? new Date(p.updated_at) : null
    return updatedAt && updatedAt < fourteenDaysAgo
  })

  type AttentionItem = {
    type: 'stale_plan' | 'overdue_action' | 'stalled_deal' | 'at_risk_goal'
    title: string
    subtitle?: string
    link: string
    daysOld?: number
  }

  const attentionItems: AttentionItem[] = [
    ...overdueActions.slice(0, 3).map(a => ({
      type: 'overdue_action' as const,
      title: a.title,
      subtitle: a.account_plans?.account_name || a.pursuits?.name,
      link: a.pursuits?.pursuit_id
        ? `/accounts/${a.account_plan_id}/pursuits/${a.pursuits.pursuit_id}`
        : `/accounts/${a.account_plan_id}`,
      daysOld: Math.floor((Date.now() - new Date(a.due_date).getTime()) / (1000 * 60 * 60 * 24))
    })),
    ...stalledDeals.slice(0, 2).map(p => ({
      type: 'stalled_deal' as const,
      title: p.name,
      subtitle: p.account_plans?.account_name,
      link: `/accounts/${p.account_plan_id}/pursuits/${p.pursuit_id}`,
      daysOld: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    })),
    ...stalePlans.slice(0, 2).map(p => ({
      type: 'stale_plan' as const,
      title: p.account_name,
      subtitle: 'No recent activity',
      link: `/accounts/${p.account_plan_id}`,
      daysOld: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    }))
  ]

  // ==========================================
  // GOALS
  // ==========================================
  // Show category sub-goals and logo goals (NOT the primary $10M ARR - it's in the hero)
  const logoGoals = goals.filter(g => g.goal_type === 'logos' && g.parent_goal_id === null)

  // Exclude the primary revenue goal (shown in hero) and show category breakdowns + logos
  const displayGoals = [
    ...categoryGoals.slice(0, 3),  // New Business, Upsell, Renewal targets
    ...logoGoals.slice(0, 2)       // Logo/customer count goals
  ].filter(Boolean) as typeof goals

  // Calculate gap
  const arrGap = Math.max(0, arrTarget - totalWeightedPipeline)

  // At risk accounts from health distribution
  const atRiskAccounts = healthDistribution.at_risk + healthDistribution.critical

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* 1. SCOUT HEALTH METRICS - Top of page */}
      <ScoutHealthMetrics
        sparksActive={sparkMetrics.sparksActive}
        pipelineCoverage={sparkMetrics.totalDealsCount > 0 ? (sparkMetrics.coveredDealsCount / sparkMetrics.totalDealsCount) * 100 : 0}
        dealsWithCoverage={sparkMetrics.coveredDealsCount}
        totalDeals={sparkMetrics.totalDealsCount}
        healthyAccounts={healthDistribution.healthy}
        atRiskAccounts={atRiskAccounts}
        overdueActions={overdueActions.length}
      />

      {/* 2. SCOUT INTELLIGENCE IMPACT */}
      <ScoutActivityLayer
        sparkMetrics={sparkMetrics}
        healthDistribution={healthDistribution}
      />

      {/* 3. TAM Opportunity + Filling the Gap */}
      <IntelligenceSummary
        tamAccountCount={tamAccounts.length}
        highPriorityCount={highPriorityTam}
        recentSignals={recentSignals.length}
        estimatedOpportunity={estimatedOpportunity}
        activeAccountPlans={accountPlans.length}
        accountsNeedingAttention={stalePlans.length + plansNeedingAttention.length}
        openPursuits={openPursuitCount}
        newBusinessGap={newBusinessGap}
        upsellGap={upsellGap}
      />

      {/* 4. Attention Required + Company Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttentionRequired
          items={attentionItems}
          stalePlans={stalePlans.length}
          overdueActions={overdueActions.length}
          stalledDeals={stalledDeals.length}
        />
        <GoalsProgress goals={displayGoals} />
      </div>

      {/* 5. ARR GOAL - CRM Section (collapsed by default, at bottom) */}
      <CollapsibleSection
        title="2026 ARR Goal"
        subtitle="CRM Pipeline & Revenue Targets"
        defaultExpanded={false}
        headerContent={
          <CompactARRSummary
            arrTarget={arrTarget}
            totalWeightedPipeline={totalWeightedPipeline}
            gap={arrGap}
            recurring={recurringPipelineValue}
            upsell={pursuitsByType['upsell']?.pipeline || 0}
            newBiz={pursuitsByType['new_business']?.pipeline || 0}
          />
        }
      >
        <ARRGoalHero
          arrTarget={arrTarget}
          renewalsConfirmed={renewalsConfirmed}
          categories={arrCategories}
          totalClosed={closedWonValue}
          totalPipeline={totalPipeline}
          totalWeightedPipeline={totalWeightedPipeline}
          pipelineByStage={stageData}
        />
      </CollapsibleSection>
    </div>
  )
}
