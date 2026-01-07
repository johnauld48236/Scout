import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ScoutTerrainMark } from '@/components/ui/scout-logo'
import { ActionCheckbox } from '@/components/account/ActionCheckbox'
import { MilestoneCheckbox } from '@/components/account/MilestoneCheckbox'
import { StakeholderCard } from '@/components/account/StakeholderQuickEdit'
import { OpportunityCardWrapper } from '@/components/account/OpportunityCardWrapper'
import { EngagementLogsSection } from '@/components/EngagementLogsSection'
import { PainPointsSection } from '@/components/PainPointsSection'
import { AccountHeaderToggles } from '@/components/account/AccountHeaderToggles'
import { ReviewNotesSection } from '@/components/account/ReviewNotesSection'
import { AddActionButton } from '@/components/account/AddActionButton'
import { ImportNotesButton } from '@/components/account/ImportNotesButton'
import { RollingTracker } from '@/components/account/RollingTracker'
import { RisksSection } from '@/components/account/RisksSection'
import { ReviewQueue } from '@/components/account/ReviewQueue'
import { DivisionsCard } from '@/components/account/DivisionsCard'
import { IntelligenceCard } from '@/components/account/IntelligenceCard'
import { OpportunitiesCard } from '@/components/account/OpportunitiesCard'
import { RecentlyDeleted } from '@/components/account/RecentlyDeleted'
import { AccountOwnerEditor } from '@/components/account/AccountOwnerEditor'
import { StakeholderSection } from '@/components/account/StakeholderSection'
import { HubSpotEnrichButton } from '@/components/integrations/HubSpotEnrichButton'
import { FinancialHealthIndicator } from '@/components/account/FinancialHealthIndicator'
import { SignalsSection } from '@/components/account/SignalsSection'
import { CampaignSelector } from '@/components/account/CampaignSelector'
import { AccountLayoutToggle } from '@/components/account/AccountLayoutToggle'
import { ExternalSourcesPanel } from '@/components/account/ExternalSourcesPanel'

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account plan
  const { data: account, error } = await supabase
    .from('account_plans')
    .select('*')
    .eq('account_plan_id', id)
    .single()

  // Fetch related data
  const [pursuitsRes, stakeholdersRes, actionsRes, engagementsRes, painPointsRes, risksRes, reviewNotesRes, bucketsRes, divisionsRes, companyProfileRes, scoutThemesRes] = await Promise.all([
    supabase.from('pursuits').select('*').eq('account_plan_id', id),
    supabase.from('stakeholders').select('*').eq('account_plan_id', id),
    supabase.from('action_items').select('*').eq('account_plan_id', id).order('due_date'),
    supabase.from('engagement_logs').select(`
      *,
      pursuits(name),
      engagement_attendees(
        stakeholder_id,
        stakeholders(full_name, title)
      )
    `).eq('account_plan_id', id).order('engagement_date', { ascending: false }),
    supabase.from('pain_points').select(`
      *,
      pursuits!pursuit_id(name),
      stakeholders!stakeholder_id(full_name)
    `).eq('account_plan_id', id).order('created_at', { ascending: false }),
    supabase.from('risks').select('*').eq('account_plan_id', id).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('review_notes').select('*').eq('account_plan_id', id).eq('is_resolved', false).order('created_at', { ascending: false }),
    supabase.from('buckets').select('*').eq('account_plan_id', id).order('display_order'),
    supabase.from('account_divisions').select('*').eq('account_plan_id', id).order('sort_order'),
    supabase.from('company_profile').select('value_proposition, tagline').limit(1).single(),
    supabase.from('scout_themes').select('*').eq('account_plan_id', id).order('created_at', { ascending: false }),
  ])

  const pursuits = pursuitsRes.data || []
  const stakeholders = stakeholdersRes.data || []
  const engagements = engagementsRes.data || []
  const reviewNotes = reviewNotesRes.data || []
  const buckets = bucketsRes.data || []
  const divisions = divisionsRes.data || []
  const companyProfile = companyProfileRes.data
  const scoutThemes = scoutThemesRes.data || []

  // Get company context from profile (what we sell)
  const companyContext = companyProfile?.value_proposition || companyProfile?.tagline || null

  // Fetch campaign context if account has campaigns
  const campaignIds = account?.campaign_ids as string[] | null
  let campaignContext: string | null = null
  if (campaignIds && campaignIds.length > 0) {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('name, campaign_context')
      .in('campaign_id', campaignIds)
    if (campaigns && campaigns.length > 0) {
      // Combine campaign names and context
      campaignContext = campaigns
        .map(c => c.name + (c.campaign_context ? `: ${c.campaign_context}` : ''))
        .join('; ')
    }
  }

  // Fetch all signals for this account - use * to handle varying column availability
  let allSignals: Array<{
    signal_id: string
    signal_type?: string
    title?: string
    summary: string
    source?: string
    confidence?: string
    category?: string
    signal_date: string
    stakeholder_id?: string
    pursuit_id?: string
    is_financial?: boolean
    sentiment_score?: number
  }> = []

  // Try with account_plan_id first, fall back to tam_account_id
  let signalsResult = await supabase
    .from('account_signals')
    .select('*')
    .eq('account_plan_id', id)
    .order('signal_date', { ascending: false })
    .limit(50)

  if (signalsResult.error?.message?.includes('column')) {
    // account_plan_id column doesn't exist, try tam_account_id
    if (account?.tam_account_id) {
      signalsResult = await supabase
        .from('account_signals')
        .select('*')
        .eq('tam_account_id', account.tam_account_id)
        .order('signal_date', { ascending: false })
        .limit(50)
    }
  }

  if (!signalsResult.error) {
    allSignals = signalsResult.data || []
  }

  // Filter financial signals for health indicator
  const financialSignals = allSignals.filter(s => s.is_financial)

  // Filter out items needing review - they show in the review queue instead
  const actionItems = (actionsRes.data || []).filter((a: { needs_review?: boolean }) => !a.needs_review)
  const rawPainPoints = painPointsRes.data || []
  const painPoints = rawPainPoints.filter((p: { needs_review?: boolean }) => !p.needs_review)
  const risks = (risksRes.data || []).filter((r: { needs_review?: boolean }) => !r.needs_review)

  // Debug logging for pain points
  console.log('[Account Page] Pain points query result:', painPointsRes.error ? `Error: ${painPointsRes.error.message}` : `Got ${rawPainPoints.length} raw pain points`)
  console.log('[Account Page] After filter (needs_review):', painPoints.length, 'pain points')

  // Fetch bucket items if there are buckets
  const bucketIds = buckets.map((b: { bucket_id: string }) => b.bucket_id)
  const bucketItemsRes = bucketIds.length > 0
    ? await supabase.from('bucket_items').select('*').in('bucket_id', bucketIds)
    : { data: [] }
  const bucketItems = bucketItemsRes.data || []

  // Calculate risk metrics
  const openRisks = risks.filter((r: { status: string }) => r.status === 'open')
  const criticalRisks = openRisks.filter((r: { severity: string }) => r.severity === 'critical' || r.severity === 'high')

  // Fetch latest BANT analysis for each pursuit (separate query after getting pursuit IDs)
  const pursuitIds = pursuits.map(p => p.pursuit_id)
  const bantRes = pursuitIds.length > 0
    ? await supabase
        .from('bant_analyses')
        .select('*')
        .in('pursuit_id', pursuitIds)
        .order('analysis_date', { ascending: false })
    : { data: [] }

  // Group BANT scores by pursuit_id (take latest for each)
  interface BANTData {
    pursuit_id: string
    budget_score: number
    authority_score: number
    need_score: number
    timeline_score: number
    analysis_date?: string
  }
  const bantByPursuit = new Map<string, BANTData>()
  for (const bant of (bantRes.data || []) as BANTData[]) {
    if (!bantByPursuit.has(bant.pursuit_id)) {
      bantByPursuit.set(bant.pursuit_id, bant)
    }
  }

  if (error || !account) {
    notFound()
  }

  // Calculate dates for focus window (2 weeks)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfFocusWindow = new Date(today)
  endOfFocusWindow.setDate(today.getDate() + 14)

  // Categorize actions
  const overdueActions = actionItems.filter(a => {
    if (a.status === 'Completed' || a.status === 'Cancelled') return false
    if (!a.due_date) return false
    return new Date(a.due_date) < today
  })

  const focusWindowActions = actionItems.filter(a => {
    if (a.status === 'Completed' || a.status === 'Cancelled') return false
    if (!a.due_date) return false
    const dueDate = new Date(a.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate >= today && dueDate <= endOfFocusWindow
  })

  const upcomingActions = actionItems.filter(a => {
    if (a.status === 'Completed' || a.status === 'Cancelled') return false
    if (!a.due_date) return false
    const dueDate = new Date(a.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate > endOfFocusWindow
  })

  // Calculate health metrics
  const planCompleteness = account.plan_completeness || 0
  // Handle estimated_value that might be stored as string or number
  const totalPipeline = pursuits.reduce((sum, p) => {
    const value = typeof p.estimated_value === 'string'
      ? parseFloat(p.estimated_value)
      : (p.estimated_value || 0)
    return sum + (isNaN(value) ? 0 : value)
  }, 0)
  const coverageGaps = stakeholders.filter(s => s.is_placeholder).length
  const activeOpportunities = pursuits.filter(p => p.stage !== 'Closed Won' && p.stage !== 'Closed Lost').length

  // Calculate BANT gaps from BANT scores
  const bantGaps: string[] = []
  for (const [pursuitId, bant] of bantByPursuit) {
    const pursuit = pursuits.find(p => p.pursuit_id === pursuitId)
    const pursuitName = pursuit?.name || 'Unknown deal'
    if (bant.budget_score < 3) {
      bantGaps.push(`Budget not confirmed for ${pursuitName}`)
    }
    if (bant.authority_score < 3) {
      bantGaps.push(`Decision maker not identified for ${pursuitName}`)
    }
    if (bant.need_score < 3) {
      bantGaps.push(`Need not fully validated for ${pursuitName}`)
    }
    if (bant.timeline_score < 3) {
      bantGaps.push(`Timeline not established for ${pursuitName}`)
    }
  }
  // Also check pursuits without any BANT analysis
  for (const pursuit of pursuits) {
    if (!bantByPursuit.has(pursuit.pursuit_id) && pursuit.stage !== 'Closed Won' && pursuit.stage !== 'Closed Lost') {
      bantGaps.push(`No BANT assessment for ${pursuit.name}`)
    }
  }

  // Milestones from plan
  const milestones = account.milestones || { day_30: [], day_60: [], day_90: [] }
  const totalMilestones = milestones.day_30.length + milestones.day_60.length + milestones.day_90.length
  const completedMilestones = [
    ...milestones.day_30.filter((m: { completed: boolean }) => m.completed),
    ...milestones.day_60.filter((m: { completed: boolean }) => m.completed),
    ...milestones.day_90.filter((m: { completed: boolean }) => m.completed),
  ].length

  // Prepare tracker actions for new layout
  // Use action_items (new system) combined with bucket_items (legacy system)
  const trackerActions: Array<{
    action_id: string
    description: string
    due_date?: string
    status: string
    bucket: '30' | '60' | '90'
    priority?: string
  }> = []

  // Add action_items with calculated bucket based on due_date
  const nowForBucket = new Date()
  for (const action of actionItems) {
    let bucket: '30' | '60' | '90' = '30'
    if (action.due_date) {
      const dueDate = new Date(action.due_date)
      const daysFromNow = Math.ceil((dueDate.getTime() - nowForBucket.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromNow > 60) bucket = '90'
      else if (daysFromNow > 30) bucket = '60'
      else bucket = '30'
    }
    trackerActions.push({
      action_id: action.action_id,
      description: action.title || action.description || '',
      due_date: action.due_date,
      status: action.status === 'Completed' ? 'completed' : action.status === 'In Progress' ? 'in_progress' : 'pending',
      bucket,
      priority: action.priority,
    })
  }

  // Also include bucket_items (legacy) if they exist
  for (const item of bucketItems) {
    const bucket = buckets.find((b: { bucket_id: string; bucket_type?: string }) => b.bucket_id === item.bucket_id)
    const bucketType = (bucket?.bucket_type || '30') as '30' | '60' | '90'
    trackerActions.push({
      action_id: item.bucket_item_id,
      description: item.description || item.title || '',
      due_date: item.due_date,
      status: item.status || 'pending',
      bucket: bucketType,
      priority: item.priority,
    })
  }

  // Prepare signals for new layout
  const signalsForNewLayout = allSignals.map(s => ({
    signal_id: s.signal_id,
    title: s.title,
    summary: s.summary,
    signal_type: s.signal_type,
    signal_date: s.signal_date,
  }))

  // Prepare stakeholders for new layout
  const stakeholdersForNewLayout = stakeholders.map((s: { stakeholder_id: string; full_name: string; title?: string; influence_level?: string }) => ({
    stakeholder_id: s.stakeholder_id,
    full_name: s.full_name,
    title: s.title,
    influence_level: s.influence_level,
  }))

  // Prepare divisions for new layout
  const divisionsForNewLayout = divisions.map((d: { division_id: string; name: string }) => ({
    division_id: d.division_id,
    name: d.name,
  }))

  // Prepare pursuits for new layout
  const pursuitsForNewLayout = pursuits.map((p: { pursuit_id: string; name: string; stage?: string; estimated_value?: number; thesis?: string }) => ({
    pursuit_id: p.pursuit_id,
    name: p.name,
    stage: p.stage || 'Discovery',
    estimated_value: typeof p.estimated_value === 'string' ? parseFloat(p.estimated_value) : p.estimated_value,
    thesis: p.thesis,
  }))

  // Prepare pain points for new layout
  const painPointsForNewLayout = painPoints.map((p: { pain_point_id: string; description?: string; severity?: string }) => ({
    pain_point_id: p.pain_point_id,
    description: p.description || '',
    severity: p.severity,
  }))

  // Prepare risks for new layout
  const risksForNewLayout = risks.map((r: { risk_id: string; description?: string; likelihood?: string }) => ({
    risk_id: r.risk_id,
    description: r.description || '',
    likelihood: r.likelihood,
  }))

  // Prepare scout themes for new layout
  const scoutThemesForNewLayout = scoutThemes.map((t: {
    theme_id: string
    title: string
    description?: string
    why_it_matters?: string
    size?: string
    questions_to_explore?: string[]
    status?: string
  }) => ({
    theme_id: t.theme_id,
    title: t.title,
    description: t.description || '',
    why_it_matters: t.why_it_matters || '',
    size: t.size || 'medium',
    questions_to_explore: t.questions_to_explore || [],
    status: t.status || 'exploring',
  }))

  return (
    <AccountLayoutToggle
      accountId={id}
      accountName={account.account_name}
      industry={account.industry}
      headquarters={account.headquarters}
      employeeCount={account.employee_count}
      website={account.website}
      divisions={divisionsForNewLayout}
      stakeholders={stakeholdersForNewLayout}
      signals={signalsForNewLayout}
      pursuits={pursuitsForNewLayout}
      trackerActions={trackerActions}
      painPoints={painPointsForNewLayout}
      risks={risksForNewLayout}
      scoutThemes={scoutThemesForNewLayout}
      hasTracker={trackerActions.length > 0}
      isFavorite={account.is_favorite || false}
      inWeeklyReview={account.in_weekly_review || false}
      lastRefreshed={account.last_reviewed_at}
    >
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/accounts"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <ScoutTerrainMark className="w-8 h-4" color="brown" />
                  <h1
                    className="text-xl font-bold"
                    style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                  >
                    {account.account_name}
                  </h1>
                  <AccountHeaderToggles
                    accountId={id}
                    initialIsFavorite={account.is_favorite || false}
                    initialInWeeklyReview={account.in_weekly_review || false}
                  />
                  {account.plan_status === 'active' && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                    >
                      Active Plan
                    </span>
                  )}
                  <FinancialHealthIndicator signals={financialSignals || []} />
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    {account.industry && `${account.industry}`}
                    {account.employee_count && ` · ${account.employee_count} employees`}
                    {account.last_reviewed_at && (
                      <span className="ml-2">
                        · Last reviewed {new Date(account.last_reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </p>
                  <span style={{ color: 'var(--scout-border)' }}>|</span>
                  <AccountOwnerEditor
                    accountId={id}
                    salesRep={account.sales_rep}
                    technicalAm={account.technical_am}
                  />
                </div>
                {/* Campaign Selector */}
                <div className="mt-2">
                  <CampaignSelector
                    accountId={id}
                    appliedCampaignIds={(account.campaign_ids as string[]) || []}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <HubSpotEnrichButton
                accountId={id}
                accountName={account.account_name}
                tamAccountId={account.tam_account_id}
              />
              <ImportNotesButton
                accountId={id}
                accountName={account.account_name}
                existingStakeholders={stakeholders.filter(s => !s.is_placeholder).map(s => s.full_name)}
              />
              <Link
                href={`/accounts/${id}/plan`}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
              >
                {account.plan_status === 'active' ? 'Edit Plan' : 'Start Planning'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Health Summary Row */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <HealthCard
            label="Pipeline"
            value={formatCurrency(totalPipeline)}
            status={totalPipeline > 0 ? 'good' : 'neutral'}
            detail={`${activeOpportunities} active opp${activeOpportunities !== 1 ? 's' : ''}`}
          />
          <HealthCard
            label="Milestones"
            value={totalMilestones > 0 ? `${completedMilestones}/${totalMilestones}` : '—'}
            status={totalMilestones === 0 ? 'neutral' : completedMilestones === totalMilestones ? 'good' : 'warning'}
            detail={totalMilestones === 0 ? 'None set' : `${totalMilestones - completedMilestones} remaining`}
          />
          <HealthCard
            label="Actions"
            value={overdueActions.length > 0 ? overdueActions.length.toString() : focusWindowActions.length.toString()}
            status={overdueActions.length > 0 ? 'alert' : focusWindowActions.length > 0 ? 'warning' : 'good'}
            detail={overdueActions.length > 0 ? 'Overdue!' : focusWindowActions.length > 0 ? 'Due soon' : 'On track'}
          />
          <HealthCard
            label="Open Risks"
            value={openRisks.length.toString()}
            status={criticalRisks.length > 0 ? 'alert' : openRisks.length > 0 ? 'warning' : 'good'}
            detail={criticalRisks.length > 0 ? `${criticalRisks.length} critical` : openRisks.length > 0 ? 'Need attention' : 'Clear'}
          />
          <HealthCard
            label="Pain Points"
            value={painPoints.filter(p => p.status !== 'addressed').length.toString()}
            status={painPoints.filter(p => p.severity === 'critical').length > 0 ? 'alert' : 'neutral'}
            detail={painPoints.filter(p => p.severity === 'critical').length > 0 ? 'Critical issues' : 'Tracked'}
          />
          <HealthCard
            label="Stakeholders"
            value={stakeholders.filter(s => !s.is_placeholder).length.toString()}
            status={coverageGaps > 0 ? 'warning' : stakeholders.length > 0 ? 'good' : 'neutral'}
            detail={coverageGaps > 0 ? `${coverageGaps} gaps` : stakeholders.length > 0 ? 'Mapped' : 'None mapped'}
          />
        </div>

        {/* Review Notes - Action items from weekly review */}
        <ReviewNotesSection accountId={id} initialNotes={reviewNotes} />

        {/* Import Review Queue - Triage imported items */}
        <ReviewQueue accountId={id} pursuits={pursuits} />

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - 30/60/90 Tracker, This Week's Focus */}
          <div className="col-span-2 space-y-6">
            {/* Rolling 30/60/90 Day Tracker - PRIMARY FOCUS */}
            <RollingTracker
              accountPlanId={id}
              accountName={account.account_name}
              painPoints={painPoints}
              risks={risks}
              milestones={milestones}
              pursuits={pursuits}
              buckets={buckets}
              bucketItems={bucketItems}
              bantGaps={bantGaps}
              accountIntelligence={{
                accountThesis: account.account_thesis,
                compellingEvents: account.compelling_events,
                buyingSignals: account.buying_signals,
                researchFindings: account.research_findings,
                vertical: account.industry,
              }}
            />

            {/* Risks Section - Shows open risks with closed risks fold */}
            <RisksSection
              accountPlanId={id}
              risks={risks}
              buckets={buckets}
              pursuits={pursuits}
              actions={actionItems}
            />

            {/* Focus Area Section */}
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
                >
                  2-Week Focus
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endOfFocusWindow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <AddActionButton accountId={id} pursuits={pursuits} risks={risks} />
                </div>
              </div>

              {/* Overdue Section - Fully Editable */}
              {overdueActions.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-clay)' }}>
                      Overdue
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                    >
                      {overdueActions.length}
                    </span>
                  </div>
                  <div
                    className="space-y-2 p-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(169, 68, 66, 0.05)' }}
                  >
                    {overdueActions.map(action => {
                      const pursuit = pursuits.find(p => p.pursuit_id === action.pursuit_id)
                      return (
                        <ActionCheckbox
                          key={action.action_id}
                          actionId={action.action_id}
                          title={action.title}
                          dueDate={action.due_date}
                          priority={action.priority}
                          pursuitName={pursuit?.name}
                          isCompleted={action.status === 'Completed'}
                          accountId={id}
                          buckets={buckets}
                          isOverdue
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Focus Window Actions */}
              {focusWindowActions.length > 0 ? (
                <div className="space-y-2">
                  {focusWindowActions.map(action => {
                    const pursuit = pursuits.find(p => p.pursuit_id === action.pursuit_id)
                    return (
                      <ActionCheckbox
                        key={action.action_id}
                        actionId={action.action_id}
                        title={action.title}
                        dueDate={action.due_date}
                        priority={action.priority}
                        pursuitName={pursuit?.name}
                        isCompleted={action.status === 'Completed'}
                        accountId={id}
                        buckets={buckets}
                      />
                    )
                  })}
                </div>
              ) : overdueActions.length === 0 ? (
                <div
                  className="p-6 rounded-lg border border-dashed text-center"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    No actions due in the next 2 weeks.
                  </p>
                  <Link
                    href={`/accounts/${id}/plan?step=5`}
                    className="text-sm font-medium mt-2 inline-block"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Add actions in planning →
                  </Link>
                </div>
              ) : null}

              {/* Upcoming Preview */}
              {upcomingActions.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                    COMING UP ({upcomingActions.length} actions)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {upcomingActions.slice(0, 4).map(action => (
                      <span
                        key={action.action_id}
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                      >
                        {action.title}
                      </span>
                    ))}
                    {upcomingActions.length > 4 && (
                      <span className="text-xs px-2 py-1" style={{ color: 'var(--scout-earth-light)' }}>
                        +{upcomingActions.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pain Points Section - Compact */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <PainPointsSection
                accountPlanId={id}
                painPoints={painPoints}
                stakeholders={stakeholders}
                pursuits={pursuits}
                engagements={engagements.map(e => ({
                  engagement_id: e.engagement_id,
                  title: e.title,
                  engagement_date: e.engagement_date,
                  engagement_type: e.engagement_type,
                }))}
                buckets={buckets}
              />
            </div>

            {/* Engagement History Section */}
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <EngagementLogsSection
                accountPlanId={id}
                engagements={engagements}
                stakeholders={stakeholders}
                pursuits={pursuits}
              />
            </div>

            {/* Recently Deleted - Undo Section */}
            <RecentlyDeleted accountId={id} />

          </div>

          {/* Right Column - Opportunities & Reference */}
          <div className="space-y-6">
            {/* Opportunities Section - Compact */}
            <OpportunitiesCard
              pursuits={pursuits}
              stakeholders={stakeholders}
              actionItems={actionItems}
              bantByPursuit={bantByPursuit}
              accountId={id}
              divisions={divisions}
              compellingEvents={account.compelling_events || []}
              buyingSignals={account.buying_signals || []}
            />

            {/* Account Intelligence Card */}
            <IntelligenceCard
              accountPlanId={id}
              accountThesis={account.account_thesis}
              compellingEvents={account.compelling_events}
              buyingSignals={account.buying_signals}
            />

            {/* External Sources Panel */}
            <ExternalSourcesPanel
              accountPlanId={id}
              accountSlug={account.account_name?.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || id.slice(0, 8)}
              slackChannelUrl={account.slack_channel_url}
              jiraProjectUrl={account.jira_project_url}
              asanaProjectUrl={account.asana_project_url}
            />

            {/* Research Signals from AI */}
            <SignalsSection
              accountId={id}
              signals={allSignals || []}
              stakeholders={stakeholders}
              pursuits={pursuits}
              accountName={account.account_name}
              website={account.website}
              industry={account.industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
              divisions={divisions}
            />

            {/* Corporate Structure / Divisions */}
            <DivisionsCard
              accountPlanId={id}
              divisions={divisions}
              stakeholders={stakeholders}
              pursuits={pursuits}
              corporateStructure={account.corporate_structure}
              accountName={account.account_name}
              website={account.website}
              industry={account.industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
            />

            {/* Stakeholder Coverage */}
            <StakeholderSection
              accountPlanId={id}
              stakeholders={stakeholders}
              divisions={divisions}
              accountName={account.account_name}
              website={account.website}
              industry={account.industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
            />

            {/* Strategy Summary */}
            {account.account_strategy && (
              <CollapsibleSection title="Strategy" defaultOpen={false}>
                <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {account.account_strategy.length > 200
                    ? account.account_strategy.slice(0, 200) + '...'
                    : account.account_strategy}
                </p>
                <Link
                  href={`/accounts/${id}/plan?step=6`}
                  className="text-xs mt-2 inline-block"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  View full strategy →
                </Link>
              </CollapsibleSection>
            )}

            {/* Competitors */}
            {account.competitors && account.competitors.length > 0 && (
              <CollapsibleSection title="Competitors" defaultOpen={false}>
                <div className="space-y-2">
                  {account.competitors.map((comp: { name: string; status?: string }, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>{comp.name}</span>
                      {comp.status && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={getCompetitorStatusStyle(comp.status)}
                        >
                          {comp.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>
    </div>
    </AccountLayoutToggle>
  )
}

// Helper Components

function HealthCard({
  label,
  value,
  status,
  detail,
}: {
  label: string
  value: string
  status: 'good' | 'warning' | 'alert' | 'neutral'
  detail: string
}) {
  const statusColors = {
    good: { bg: 'rgba(93, 122, 93, 0.1)', color: 'var(--scout-trail)' },
    warning: { bg: 'rgba(210, 105, 30, 0.1)', color: 'var(--scout-sunset)' },
    alert: { bg: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' },
    neutral: { bg: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' },
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
        {label}
      </p>
      <p
        className="text-xl font-bold mt-1"
        style={{ color: statusColors[status].color }}
      >
        {value}
      </p>
      <p
        className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block"
        style={{ backgroundColor: statusColors[status].bg, color: statusColors[status].color }}
      >
        {detail}
      </p>
    </div>
  )
}

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-xl border group"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <summary
        className="p-4 cursor-pointer flex items-center justify-between list-none"
        style={{ color: 'var(--scout-saddle)' }}
      >
        <span className="font-semibold" style={{ fontFamily: "'Bitter', Georgia, serif" }}>
          {title}
        </span>
        <svg
          className="w-4 h-4 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-4 pb-4">
        {children}
      </div>
    </details>
  )
}

// Utility functions

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function getRoleTypeBadgeStyle(roleType: string) {
  switch (roleType) {
    case 'Champion':
      return { backgroundColor: 'rgba(93, 122, 93, 0.2)', color: '#4a7a4a' }
    case 'Economic Buyer':
      return { backgroundColor: 'rgba(74, 144, 164, 0.2)', color: '#3a8094' }
    case 'Technical Buyer':
      return { backgroundColor: 'rgba(139, 69, 19, 0.2)', color: '#7a3c11' }
    case 'Influencer':
      return { backgroundColor: 'rgba(210, 105, 30, 0.2)', color: '#b85a1a' }
    case 'Blocker':
      return { backgroundColor: 'rgba(169, 68, 66, 0.2)', color: '#a94442' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
  }
}

function getPriorityStyle(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return { backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }
    case 'medium':
      return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }
    case 'low':
      return { backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
  }
}

function getCompetitorStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'incumbent':
    case 'active':
      return { backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }
    case 'evaluating':
      return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }
    case 'weak':
    case 'displaced':
      return { backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }
    default:
      return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
  }
}
