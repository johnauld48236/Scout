import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Helper to get Monday of current week
function getWeekMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

// Helper to get Monday of previous week
function getPreviousWeekMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return getWeekMonday(d)
}

export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date()
    const currentWeek = getWeekMonday()
    const previousWeek = getPreviousWeekMonday()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    // Get all accounts in weekly review
    const { data: accounts, error: accountsError } = await supabase
      .from('account_plans')
      .select('*')
      .eq('in_weekly_review', true)
      .order('is_favorite', { ascending: false })
      .order('account_name')

    if (accountsError) {
      return Response.json({ error: accountsError.message }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return Response.json({ accounts: [], summary: { total: 0, needsAttention: 0 } })
    }

    const accountIds = accounts.map(a => a.account_plan_id)

    // Fetch all related data in parallel
    const [
      pursuitsRes,
      stakeholdersRes,
      actionsRes,
      risksRes,
      engagementsRes,
      notesRes,
      snapshotsRes,
      bantRes,
    ] = await Promise.all([
      supabase.from('pursuits').select('*').in('account_plan_id', accountIds),
      supabase.from('stakeholders').select('*').in('account_plan_id', accountIds),
      supabase.from('action_items').select('*').in('account_plan_id', accountIds),
      supabase.from('risks').select('*').in('account_plan_id', accountIds).eq('status', 'open').is('deleted_at', null),
      supabase.from('engagement_logs').select('*').in('account_plan_id', accountIds),
      supabase.from('review_notes').select('*').in('account_plan_id', accountIds).eq('is_resolved', false),
      supabase.from('weekly_snapshots').select('*').in('account_plan_id', accountIds).eq('snapshot_week', previousWeek),
      supabase.from('bant_analyses').select('*').in('pursuit_id',
        (await supabase.from('pursuits').select('pursuit_id').in('account_plan_id', accountIds)).data?.map(p => p.pursuit_id) || []
      ),
    ])

    const pursuits = pursuitsRes.data || []
    const stakeholders = stakeholdersRes.data || []
    const actions = actionsRes.data || []
    const risks = risksRes.data || []
    const engagements = engagementsRes.data || []
    const notes = notesRes.data || []
    const previousSnapshots = snapshotsRes.data || []
    const bantAnalyses = bantRes.data || []

    // Build enriched account data
    const enrichedAccounts = accounts.map(account => {
      const accountPursuits = pursuits.filter(p => p.account_plan_id === account.account_plan_id)
      const accountStakeholders = stakeholders.filter(s => s.account_plan_id === account.account_plan_id)
      const accountActions = actions.filter(a => a.account_plan_id === account.account_plan_id)
      const accountRisks = risks.filter(r => r.account_plan_id === account.account_plan_id)
      const accountEngagements = engagements.filter(e => e.account_plan_id === account.account_plan_id)
      const accountNotes = notes.filter(n => n.account_plan_id === account.account_plan_id)
      const previousSnapshot = previousSnapshots.find(s => s.account_plan_id === account.account_plan_id)

      // Calculate metrics
      const pipelineValue = accountPursuits.reduce((sum, p) => {
        const value = typeof p.estimated_value === 'string' ? parseFloat(p.estimated_value) : (p.estimated_value || 0)
        return sum + (isNaN(value) ? 0 : value)
      }, 0)

      const overdueActions = accountActions.filter(a => {
        if (a.status === 'Completed' || a.status === 'Cancelled') return false
        if (!a.due_date) return false
        return new Date(a.due_date) < today
      })

      const thisWeekActions = accountActions.filter(a => {
        if (a.status === 'Completed' || a.status === 'Cancelled') return false
        if (!a.due_date) return false
        const dueDate = new Date(a.due_date)
        const endOfWeek = new Date(today)
        endOfWeek.setDate(today.getDate() + 7)
        return dueDate >= today && dueDate <= endOfWeek
      })

      const criticalRisks = accountRisks.filter(r => r.severity === 'critical' || r.severity === 'high')

      // Last engagement date
      const sortedEngagements = accountEngagements.sort((a, b) =>
        new Date(b.engagement_date).getTime() - new Date(a.engagement_date).getTime()
      )
      const lastEngagement = sortedEngagements[0]
      const daysSinceEngagement = lastEngagement
        ? Math.floor((today.getTime() - new Date(lastEngagement.engagement_date).getTime()) / (1000 * 60 * 60 * 24))
        : null

      // Engagements this week
      const engagementsThisWeek = accountEngagements.filter(e =>
        new Date(e.engagement_date) >= sevenDaysAgo
      )

      // BANT summary - get latest for each pursuit
      const pursuitIds = accountPursuits.map(p => p.pursuit_id)
      const accountBant = bantAnalyses.filter(b => pursuitIds.includes(b.pursuit_id))
      const bantByPursuit: Record<string, { B: number; A: number; N: number; T: number }> = {}
      accountBant.forEach(b => {
        if (!bantByPursuit[b.pursuit_id]) {
          bantByPursuit[b.pursuit_id] = {
            B: b.budget_score || 0,
            A: b.authority_score || 0,
            N: b.need_score || 0,
            T: b.timeline_score || 0,
          }
        }
      })

      // Find BANT gaps (any dimension < 15 across any pursuit)
      const bantGaps: string[] = []
      Object.values(bantByPursuit).forEach(scores => {
        if (scores.B < 15 && !bantGaps.includes('Budget')) bantGaps.push('Budget')
        if (scores.A < 15 && !bantGaps.includes('Authority')) bantGaps.push('Authority')
        if (scores.N < 15 && !bantGaps.includes('Need')) bantGaps.push('Need')
        if (scores.T < 15 && !bantGaps.includes('Timeline')) bantGaps.push('Timeline')
      })

      // Calculate average BANT score
      const bantScores = Object.values(bantByPursuit)
      const avgBantScore = bantScores.length > 0
        ? Math.round(bantScores.reduce((sum, s) => sum + s.B + s.A + s.N + s.T, 0) / (bantScores.length * 4))
        : null

      // Week over week changes
      const pipelineChange = previousSnapshot
        ? pipelineValue - (previousSnapshot.pipeline_value || 0)
        : null

      // Determine attention status
      const needsAttention =
        overdueActions.length > 0 ||
        criticalRisks.length > 0 ||
        (daysSinceEngagement !== null && daysSinceEngagement > 7) ||
        bantGaps.length > 0

      return {
        ...account,
        // Computed metrics
        pipeline_value: pipelineValue,
        opportunity_count: accountPursuits.length,
        stakeholder_count: accountStakeholders.filter(s => !s.is_placeholder).length,
        overdue_action_count: overdueActions.length,
        this_week_action_count: thisWeekActions.length,
        open_risk_count: accountRisks.length,
        critical_risk_count: criticalRisks.length,
        days_since_engagement: daysSinceEngagement,
        engagements_this_week: engagementsThisWeek.length,
        unresolved_notes_count: accountNotes.length,
        bant_gaps: bantGaps,
        avg_bant_score: avgBantScore,
        pipeline_change: pipelineChange,
        needs_attention: needsAttention,
        // Related data for expansion
        pursuits: accountPursuits,
        risks: accountRisks,
        notes: accountNotes,
        recent_engagements: sortedEngagements.slice(0, 3),
        overdue_actions: overdueActions,
        this_week_actions: thisWeekActions,
        bant_by_pursuit: bantByPursuit,
      }
    })

    // Sort: needs attention first, then by favorite, then by name
    enrichedAccounts.sort((a, b) => {
      if (a.needs_attention !== b.needs_attention) return a.needs_attention ? -1 : 1
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1
      return a.account_name.localeCompare(b.account_name)
    })

    const summary = {
      total: enrichedAccounts.length,
      needsAttention: enrichedAccounts.filter(a => a.needs_attention).length,
      totalPipeline: enrichedAccounts.reduce((sum, a) => sum + a.pipeline_value, 0),
      totalRisks: enrichedAccounts.reduce((sum, a) => sum + a.open_risk_count, 0),
    }

    return Response.json({ accounts: enrichedAccounts, summary, currentWeek })
  } catch (error) {
    console.error('Weekly review API error:', error)
    return Response.json({ error: 'Failed to load weekly review data' }, { status: 500 })
  }
}
