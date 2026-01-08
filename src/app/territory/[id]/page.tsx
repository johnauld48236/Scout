import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrototypePageClient } from '@/app/accounts/[id]/prototype/PrototypePageClient'

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic'

// Territory page - prototype view as default
export default async function TerritoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account plan (territory)
  const { data: account, error } = await supabase
    .from('account_plans')
    .select('*')
    .eq('account_plan_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch all related data in parallel
  const [
    pursuitsRes,
    stakeholdersRes,
    actionsRes,
    risksRes,
    painPointsRes,
    divisionsRes,
    scoutThemesRes,
    signalsRes,
    productUsageRes,
  ] = await Promise.all([
    supabase.from('pursuits').select('*, crm_url, hubspot_deal_id').eq('account_plan_id', id),
    supabase.from('stakeholders').select('*').eq('account_plan_id', id),
    supabase.from('action_items').select('*').eq('account_plan_id', id).order('due_date'),
    supabase.from('risks').select('*').eq('account_plan_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('pain_points').select('*').eq('account_plan_id', id).order('created_at', { ascending: false }),
    supabase.from('account_divisions').select('*').eq('account_plan_id', id).order('sort_order'),
    supabase.from('scout_themes').select('*, linked_pursuit_id, converted_to_pursuit_id').eq('account_plan_id', id).order('created_at', { ascending: false }),
    supabase.from('account_signals').select('*').eq('account_plan_id', id).order('signal_date', { ascending: false }).limit(20),
    supabase.from('division_product_usage').select('*').eq('account_plan_id', id),
  ])

  const pursuits = pursuitsRes.data || []
  const stakeholders = stakeholdersRes.data || []
  const actionItems = actionsRes.data || []
  const risks = (risksRes.data || []).filter((r: { needs_review?: boolean }) => !r.needs_review)
  const painPoints = (painPointsRes.data || []).filter((p: { needs_review?: boolean }) => !p.needs_review)
  const divisions = divisionsRes.data || []
  const scoutThemes = scoutThemesRes.data || []
  const signals = signalsRes.data || []
  const productUsage = productUsageRes.data || []

  // Transform scout_themes to Trail format
  const sparks = scoutThemes.map((theme: {
    theme_id: string
    title: string
    description?: string
    size?: string
    questions_to_explore?: string[]
    status?: string
    linked_pursuit_id?: string
    converted_to_pursuit_id?: string
  }) => ({
    spark_id: theme.theme_id,
    title: theme.title || 'Untitled Trail',
    description: theme.description || '',
    size: (theme.size === 'high' || theme.size === 'medium' || theme.size === 'low' ? theme.size : 'medium') as 'high' | 'medium' | 'low',
    signals_connected: [], // TODO: wire from spark_signal_links if exists
    questions_to_explore: theme.questions_to_explore || [],
    status: theme.status || 'exploring',
    linked_pursuit_id: theme.linked_pursuit_id || null,
    converted_to_pursuit_id: theme.converted_to_pursuit_id || null,
  }))

  // Transform pursuits to match interface
  const pursuitsForClient = pursuits.map((p: {
    pursuit_id: string
    name: string
    stage?: string
    estimated_value?: number | string
    target_close_date?: string
    deal_type?: string
    crm_url?: string
    hubspot_deal_id?: string
  }) => ({
    pursuit_id: p.pursuit_id,
    name: p.name || 'Untitled Pursuit',
    stage: p.stage || 'Discovery',
    estimated_value: typeof p.estimated_value === 'string'
      ? parseFloat(p.estimated_value) || 0
      : (p.estimated_value || 0),
    target_close_date: p.target_close_date || null,
    deal_type: p.deal_type || null,
    crm_url: p.crm_url || null,
  }))

  // Transform action_items with bucket calculation
  const now = new Date()
  const actionItemsForClient = actionItems.map((action: {
    action_id: string
    title?: string
    description?: string
    due_date?: string
    status?: string
    priority?: string
    bucket?: string
    slip_acknowledged?: boolean
    initiative_id?: string
  }) => {
    // Use stored bucket if available, otherwise calculate from due_date
    let bucket: '30' | '60' | '90' = (action.bucket as '30' | '60' | '90') || '30'
    if (!action.bucket && action.due_date) {
      const dueDate = new Date(action.due_date)
      const daysFromNow = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromNow > 60) bucket = '90'
      else if (daysFromNow > 30) bucket = '60'
      else bucket = '30'
    }

    return {
      action_id: action.action_id,
      title: action.title || action.description || 'Untitled Action',
      due_date: action.due_date || '',
      status: action.status || 'pending',
      priority: action.priority || 'Medium',
      bucket,
      slip_acknowledged: action.slip_acknowledged || false,
      initiative_id: action.initiative_id,
    }
  })

  // Transform pain_points - include all fields needed by tracker adapter
  const painPointsForClient = painPoints.map((p: {
    pain_point_id: string
    description?: string
    title?: string
    severity?: string
    status?: string
    target_date?: string
    created_at?: string
    initiative_id?: string
    bucket?: string
  }) => ({
    pain_point_id: p.pain_point_id,
    title: p.title || p.description || 'Untitled Pain Point',
    description: p.description,
    severity: p.severity || 'moderate',
    status: p.status || 'active',
    target_date: p.target_date,
    created_at: p.created_at,
    initiative_id: p.initiative_id,
    bucket: p.bucket,
  }))

  // Transform risks - include all fields needed by tracker adapter
  const risksForClient = risks.map((r: {
    risk_id: string
    title?: string
    description?: string
    severity?: string
    status?: string
    target_date?: string
    created_at?: string
    initiative_id?: string
    bucket?: string
  }) => ({
    risk_id: r.risk_id,
    title: r.title || r.description || 'Untitled Risk',
    description: r.description,
    severity: r.severity || 'medium',
    status: r.status || 'open',
    target_date: r.target_date,
    created_at: r.created_at,
    initiative_id: r.initiative_id,
    bucket: r.bucket,
  }))

  // Transform signals
  const signalsForClient = signals.map((s: {
    signal_id: string
    title?: string
    summary?: string
    signal_type?: string
    signal_date?: string
  }) => ({
    signal_id: s.signal_id,
    title: s.title || s.summary || 'Signal',
    type: s.signal_type || 'general',
    date: s.signal_date || new Date().toISOString(),
  }))

  // Transform stakeholders (Compass) - include is_placeholder for confirmed vs waypoint distinction
  const stakeholdersForClient = stakeholders.map((s: {
    stakeholder_id: string
    full_name?: string
    title?: string
    email?: string
    phone?: string
    influence_level?: string
    engagement_level?: string
    is_placeholder?: boolean
    placeholder_role?: string
  }) => ({
    stakeholder_id: s.stakeholder_id,
    name: s.full_name || 'Unknown',
    title: s.title || '',
    email: s.email || '',
    phone: s.phone || '',
    influence_level: s.influence_level || s.engagement_level || 'medium',
    is_placeholder: s.is_placeholder || false,
    placeholder_role: s.placeholder_role || '',
  }))

  // Transform divisions
  const divisionsForClient = divisions.map((d: {
    division_id: string
    name: string
  }) => ({
    division_id: d.division_id,
    name: d.name,
  }))

  // Calculate discovery status from actual data
  const discoveryStatus = {
    structure: { complete: divisions.length > 0, count: divisions.length },
    people: { complete: stakeholders.length >= 3, count: stakeholders.length },
    signals: { complete: signals.length >= 2, count: signals.length },
    sparks: { complete: sparks.length > 0, count: sparks.length },
    plan: { complete: actionItemsForClient.length > 0, count: actionItemsForClient.length },
  }

  // Prepare account data
  const accountData = {
    account_plan_id: account.account_plan_id,
    account_name: account.account_name || 'Unknown Territory',
    industry: account.industry,
    headquarters: account.headquarters,
    employee_count: account.employee_count,
    website: account.website,
    is_favorite: account.is_favorite || false,
    in_weekly_review: account.in_weekly_review || false,
    slack_channel_url: account.slack_channel_url,
    jira_project_url: account.jira_project_url,
    asana_project_url: account.asana_project_url,
    // Additional fields for mature components
    account_thesis: account.account_thesis,
    compelling_events: account.compelling_events,
    buying_signals: account.buying_signals,
    corporate_structure: account.corporate_structure,
    // Health score fields
    account_type: account.account_type,
    nps_score: account.nps_score,
    csat_score: account.csat_score,
  }

  return (
    <PrototypePageClient
      accountId={id}
      account={accountData}
      sparks={sparks}
      pursuits={pursuitsForClient}
      actionItems={actionItemsForClient}
      painPoints={painPointsForClient}
      risks={risksForClient}
      signals={signalsForClient}
      stakeholders={stakeholdersForClient}
      divisions={divisionsForClient}
      discoveryStatus={discoveryStatus}
      useScoutTerminology={true}
      // Full data for mature components
      rawDivisions={divisions}
      rawStakeholders={stakeholders}
      rawSignals={signals}
      rawPursuits={pursuits}
      productUsage={productUsage}
    />
  )
}
