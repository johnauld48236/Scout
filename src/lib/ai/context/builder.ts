import { createClient } from '@/lib/supabase/server'
import type { NavigationContext, AIContext, EntityContext, PlatformContext, CompanyContext, ActiveCampaignSummary, CampaignDetails } from './types'

// Build enriched AI context from navigation context
export async function buildAIContext(
  navigation: NavigationContext
): Promise<AIContext> {
  const supabase = await createClient()

  // Fetch entity data if viewing a specific entity
  let entity: EntityContext | undefined
  if (navigation.entityType && navigation.entityId) {
    entity = await fetchEntityContext(supabase, navigation.entityType, navigation.entityId)
  }

  // Fetch platform-wide context
  const platform = await fetchPlatformContext(supabase)

  // Fetch company profile
  const company = await fetchCompanyContext(supabase)

  return {
    navigation,
    entity,
    platform,
    company,
  }
}

// Fetch company profile for AI context
async function fetchCompanyContext(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CompanyContext | undefined> {
  try {
    const { data } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single()

    if (!data) return undefined

    return {
      company_name: data.company_name,
      industry: data.industry,
      value_proposition: data.value_proposition,
      key_differentiators: data.key_differentiators,
      ideal_customer_profile: data.ideal_customer_profile,
      target_verticals: data.target_verticals,
      products_services: data.products_services,
      competitors: data.competitors,
      competitive_positioning: data.competitive_positioning,
      buying_triggers: data.buying_triggers,
      key_stakeholder_roles: data.key_stakeholder_roles,
    }
  } catch (error) {
    // Company profile not set up yet - that's okay
    return undefined
  }
}

// Fetch active campaigns for AI context (lightweight summary)
async function fetchActiveCampaigns(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ActiveCampaignSummary[]> {
  try {
    // Fetch active campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select(`
        campaign_id,
        name,
        type,
        status,
        target_verticals,
        target_geos,
        pipeline_goal,
        end_date
      `)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })

    if (!campaigns || campaigns.length === 0) {
      return []
    }

    // Fetch pursuit metrics for each campaign
    const campaignIds = campaigns.map(c => c.campaign_id)

    // Get pursuits linked to accounts that are linked to campaigns
    const { data: accountPlans } = await supabase
      .from('account_plans')
      .select('account_plan_id, campaign_id')
      .in('campaign_id', campaignIds)

    const accountPlanIds = accountPlans?.map(ap => ap.account_plan_id) || []

    let pursuitsByAccount: Record<string, { count: number; value: number }> = {}

    if (accountPlanIds.length > 0) {
      const { data: pursuits } = await supabase
        .from('pursuits')
        .select('pursuit_id, account_plan_id, estimated_value')
        .in('account_plan_id', accountPlanIds)
        .not('stage', 'in', '("Closed_Won","Closed_Lost")')

      // Group pursuits by account_plan_id
      pursuits?.forEach(p => {
        const accountPlan = accountPlans?.find(ap => ap.account_plan_id === p.account_plan_id)
        if (accountPlan?.campaign_id) {
          if (!pursuitsByAccount[accountPlan.campaign_id]) {
            pursuitsByAccount[accountPlan.campaign_id] = { count: 0, value: 0 }
          }
          pursuitsByAccount[accountPlan.campaign_id].count++
          pursuitsByAccount[accountPlan.campaign_id].value += (p.estimated_value || 0)
        }
      })
    }

    // Build campaign summaries
    return campaigns.map(campaign => ({
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      type: campaign.type as 'Vertical' | 'Thematic',
      status: campaign.status,
      target_verticals: campaign.target_verticals || [],
      target_geos: campaign.target_geos || [],
      pipeline_goal: campaign.pipeline_goal,
      current_pipeline: pursuitsByAccount[campaign.campaign_id]?.value || 0,
      pursuit_count: pursuitsByAccount[campaign.campaign_id]?.count || 0,
      end_date: campaign.end_date,
    }))
  } catch (error) {
    console.error('Error fetching active campaigns:', error)
    return []
  }
}

// Fetch full campaign details on demand (for AI tool use)
export async function getCampaignDetails(
  campaignId: string
): Promise<CampaignDetails | null> {
  try {
    const supabase = await createClient()

    // Fetch campaign data
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (error || !campaign) {
      console.error('Error fetching campaign details:', error)
      return null
    }

    // Fetch related metrics
    const { data: accountPlans } = await supabase
      .from('account_plans')
      .select('account_plan_id')
      .eq('campaign_id', campaignId)

    const accountPlanIds = accountPlans?.map(ap => ap.account_plan_id) || []
    let currentPipeline = 0
    let pursuitCount = 0

    if (accountPlanIds.length > 0) {
      const { data: pursuits } = await supabase
        .from('pursuits')
        .select('pursuit_id, estimated_value')
        .in('account_plan_id', accountPlanIds)
        .not('stage', 'in', '("Closed_Won","Closed_Lost")')

      pursuits?.forEach(p => {
        pursuitCount++
        currentPipeline += (p.estimated_value || 0)
      })
    }

    return {
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      type: campaign.type as 'Vertical' | 'Thematic',
      status: campaign.status,
      target_verticals: campaign.target_verticals || [],
      target_geos: campaign.target_geos || [],
      target_company_profile: campaign.target_company_profile,
      value_proposition: campaign.value_proposition,
      key_pain_points: campaign.key_pain_points,
      signal_triggers: campaign.signal_triggers,
      regulatory_context: campaign.regulatory_context,
      industry_dynamics: campaign.industry_dynamics,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      pipeline_goal: campaign.pipeline_goal,
      conversion_goal: campaign.conversion_goal,
      current_pipeline: currentPipeline,
      pursuit_count: pursuitCount,
      account_count: accountPlanIds.length,
    }
  } catch (error) {
    console.error('Error in getCampaignDetails:', error)
    return null
  }
}

// Get campaign details by name (fuzzy match for AI tool use)
export async function getCampaignByName(
  campaignName: string
): Promise<CampaignDetails | null> {
  try {
    const supabase = await createClient()

    // Try exact match first
    let { data: campaign } = await supabase
      .from('campaigns')
      .select('campaign_id')
      .ilike('name', campaignName)
      .limit(1)
      .single()

    // If no exact match, try fuzzy match
    if (!campaign) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('campaign_id, name')
        .ilike('name', `%${campaignName}%`)
        .limit(1)

      campaign = campaigns?.[0] ?? null
    }

    if (!campaign) {
      return null
    }

    return getCampaignDetails(campaign.campaign_id)
  } catch (error) {
    console.error('Error in getCampaignByName:', error)
    return null
  }
}

// Fetch entity-specific data
async function fetchEntityContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entityType: string,
  entityId: string
): Promise<EntityContext | undefined> {
  try {
    switch (entityType) {
      case 'goal': {
        const { data } = await supabase
          .from('goals')
          .select('*')
          .eq('goal_id', entityId)
          .single()
        if (!data) return undefined

        // Fetch child goals
        const { data: childGoals } = await supabase
          .from('goals')
          .select('goal_id, name, target_value, current_value')
          .eq('parent_goal_id', entityId)

        return {
          type: 'goal',
          id: entityId,
          data,
          related: { childGoals: childGoals || [] }
        }
      }

      case 'account_plan': {
        const { data } = await supabase
          .from('account_plans')
          .select('*')
          .eq('account_plan_id', entityId)
          .single()
        if (!data) return undefined

        // Fetch related pursuits
        const { data: pursuits } = await supabase
          .from('pursuits')
          .select('pursuit_id, name, stage, estimated_value, probability')
          .eq('account_plan_id', entityId)

        // Fetch stakeholders
        const { data: stakeholders } = await supabase
          .from('stakeholders')
          .select('stakeholder_id, full_name, role_type, sentiment')
          .eq('account_plan_id', entityId)

        return {
          type: 'account_plan',
          id: entityId,
          data,
          related: {
            pursuits: pursuits || [],
            stakeholders: stakeholders || []
          }
        }
      }

      case 'pursuit': {
        const { data } = await supabase
          .from('pursuits')
          .select('*, account_plans(account_name, vertical)')
          .eq('pursuit_id', entityId)
          .single()
        if (!data) return undefined

        // Fetch latest BANT
        const { data: bant } = await supabase
          .from('bant_analyses')
          .select('*')
          .eq('pursuit_id', entityId)
          .order('analysis_date', { ascending: false })
          .limit(1)

        return {
          type: 'pursuit',
          id: entityId,
          data,
          related: { bantAnalyses: bant || [] }
        }
      }

      case 'tam_account': {
        const { data } = await supabase
          .from('tam_accounts')
          .select('*')
          .eq('tam_account_id', entityId)
          .single()
        if (!data) return undefined

        // Fetch signals
        const { data: signals } = await supabase
          .from('account_signals')
          .select('*')
          .eq('tam_account_id', entityId)
          .order('signal_date', { ascending: false })
          .limit(5)

        // Fetch warm paths
        const { data: warmPaths } = await supabase
          .from('tam_warm_paths')
          .select('*')
          .eq('tam_account_id', entityId)

        return {
          type: 'tam_account',
          id: entityId,
          data,
          related: {
            signals: signals || [],
            warmPaths: warmPaths || []
          }
        }
      }

      case 'campaign': {
        const { data } = await supabase
          .from('campaigns')
          .select('*')
          .eq('campaign_id', entityId)
          .single()
        if (!data) return undefined

        return {
          type: 'campaign',
          id: entityId,
          data,
        }
      }

      case 'stakeholder': {
        const { data } = await supabase
          .from('stakeholders')
          .select('*, account_plans(account_name)')
          .eq('stakeholder_id', entityId)
          .single()
        if (!data) return undefined

        return {
          type: 'stakeholder',
          id: entityId,
          data,
        }
      }

      case 'action_item': {
        const { data } = await supabase
          .from('action_items')
          .select('*, account_plans(account_name), pursuits(name)')
          .eq('action_id', entityId)
          .single()
        if (!data) return undefined

        return {
          type: 'action_item',
          id: entityId,
          data,
        }
      }

      default:
        return undefined
    }
  } catch (error) {
    console.error('Error fetching entity context:', error)
    return undefined
  }
}

// Fetch platform-wide context (goals, pipeline, alerts)
async function fetchPlatformContext(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PlatformContext> {
  try {
    // Fetch primary goal
    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('is_active', true)
      .eq('target_year', 2026)
      .is('parent_goal_id', null)
      .eq('goal_type', 'revenue')
      .limit(1)

    const primaryGoal = goals?.[0]
    let goalsContext: PlatformContext['goals']

    if (primaryGoal) {
      const progressPercent = primaryGoal.target_value > 0
        ? Math.round((primaryGoal.current_value / primaryGoal.target_value) * 100)
        : 0

      // Count at-risk and on-track goals
      const { data: allGoals } = await supabase
        .from('goals')
        .select('target_value, current_value')
        .eq('is_active', true)
        .eq('target_year', 2026)
        .not('vertical', 'is', null)

      let atRiskCount = 0
      let onTrackCount = 0
      allGoals?.forEach(g => {
        const pct = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0
        if (pct >= 70) onTrackCount++
        else if (pct < 40) atRiskCount++
      })

      goalsContext = {
        primaryGoal: {
          name: primaryGoal.name,
          target: primaryGoal.target_value,
          current: primaryGoal.current_value,
          gap: Math.max(0, primaryGoal.target_value - primaryGoal.current_value),
          progressPercent,
        },
        atRiskCount,
        onTrackCount,
      }
    }

    // Fetch pipeline stats
    const { data: pursuits } = await supabase
      .from('pursuits')
      .select('pursuit_id, stage, estimated_value, confirmed_value, probability, updated_at')
      .not('stage', 'in', '("Closed_Won","Closed_Lost")')

    const activePursuits = pursuits || []
    const totalValue = activePursuits.reduce((sum, p) =>
      sum + (p.confirmed_value || p.estimated_value || 0), 0)
    const weightedValue = activePursuits.reduce((sum, p) => {
      const value = p.confirmed_value || p.estimated_value || 0
      const prob = p.probability || 25
      return sum + (value * prob / 100)
    }, 0)

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const stalledCount = activePursuits.filter(p =>
      new Date(p.updated_at) < fourteenDaysAgo
    ).length

    const pipelineContext: PlatformContext['pipeline'] = {
      totalValue,
      activeCount: activePursuits.length,
      stalledCount,
      weightedValue,
    }

    // Fetch alert counts
    const today = new Date().toISOString().split('T')[0]
    const { count: overdueCount } = await supabase
      .from('action_items')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("Completed","Cancelled")')
      .lt('due_date', today)

    const alertsContext: PlatformContext['alerts'] = {
      overdueActionsCount: overdueCount || 0,
      stalledPursuitsCount: stalledCount,
      atRiskGoalsCount: goalsContext?.atRiskCount || 0,
    }

    // Fetch active campaigns
    const activeCampaigns = await fetchActiveCampaigns(supabase)

    return {
      goals: goalsContext,
      pipeline: pipelineContext,
      alerts: alertsContext,
      activeCampaigns: activeCampaigns.length > 0 ? activeCampaigns : undefined,
    }
  } catch (error) {
    console.error('Error fetching platform context:', error)
    return {}
  }
}

// Parse navigation context from URL pathname
export function parseNavigationFromPath(pathname: string, searchParams?: URLSearchParams): NavigationContext {
  const segments = pathname.split('/').filter(Boolean)

  // Default
  let page: NavigationContext['page'] = 'other'
  let entityType: NavigationContext['entityType']
  let entityId: NavigationContext['entityId']

  if (segments.length === 0 || pathname === '/') {
    page = 'dashboard'
  } else {
    const firstSegment = segments[0]

    switch (firstSegment) {
      case 'goals':
        page = 'goals'
        if (segments[1] && segments[1] !== 'new') {
          entityType = 'goal'
          entityId = segments[1]
        }
        break

      case 'campaigns':
        page = 'campaigns'
        if (segments[1]) {
          entityType = 'campaign'
          entityId = segments[1]
        }
        break

      case 'accounts':
        page = 'accounts'
        if (segments[1]) {
          entityType = 'account_plan'
          entityId = segments[1]
        }
        break

      case 'pursuits':
        page = 'pursuits'
        if (segments[1]) {
          entityType = 'pursuit'
          entityId = segments[1]
        }
        break

      case 'stakeholders':
        page = 'stakeholders'
        if (segments[1]) {
          entityType = 'stakeholder'
          entityId = segments[1]
        }
        break

      case 'actions':
        page = 'actions'
        if (segments[1]) {
          entityType = 'action_item'
          entityId = segments[1]
        }
        break

      case 'tam':
        if (segments[1] === 'gaps') {
          page = 'tam-gaps'
        } else if (segments[1] === 'list') {
          page = 'tam-list'
        } else if (segments[1]) {
          page = 'tam'
          entityType = 'tam_account'
          entityId = segments[1]
        } else {
          page = 'tam'
        }
        break
    }
  }

  return {
    page,
    entityType,
    entityId,
  }
}
