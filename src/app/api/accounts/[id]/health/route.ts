// app/api/accounts/[id]/health/route.ts
// Account health calculation and retrieval API
// Note: [id] param is account_plan_id (our primary entity)

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  calculateHealthScore,
  calculateVectorInHealthScore,
  type HealthInputs,
  type VectorInHealthInputs,
  type ScoringProfile,
} from '@/lib/scoring/health-score';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Calculate and save health score
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: accountPlanId } = await params;
    const supabase = await createClient();

    // Fetch account to determine scoring profile
    const { data: account } = await supabase
      .from('account_plans')
      .select('account_type, nps_score, csat_score')
      .eq('account_plan_id', accountPlanId)
      .single();

    const isCustomer = account?.account_type === 'customer';
    const scoringProfile: ScoringProfile = isCustomer ? 'vector_in' : 'vector_out';

    if (isCustomer) {
      // Vector In (Customer) scoring
      const inputs = await gatherVectorInInputs(supabase, accountPlanId, account);
      const healthScore = calculateVectorInHealthScore(inputs);

      // Upsert to database - using existing columns for Vector In scores
      // sentiment_score -> engagement_score slot, usage_score -> momentum_score slot
      // support_score -> risk_score slot, engagement_score -> intelligence_score slot
      const { data, error } = await supabase
        .from('account_health_scores')
        .upsert(
          {
            account_plan_id: accountPlanId,
            engagement_score: healthScore.sentiment_score, // Sentiment (40)
            momentum_score: healthScore.usage_score,       // Usage (30)
            risk_score: healthScore.support_score,          // Support (20)
            intelligence_score: healthScore.engagement_score, // Engagement (10)
            health_band: healthScore.health_band,
            score_inputs: {
              profile: 'vector_in',
              ...healthScore.score_inputs,
            },
            calculated_at: new Date().toISOString(),
          },
          {
            onConflict: 'account_plan_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ...data,
        profile: 'vector_in',
        sentiment_score: healthScore.sentiment_score,
        usage_score: healthScore.usage_score,
        support_score: healthScore.support_score,
        customer_engagement_score: healthScore.engagement_score,
        total_score: healthScore.total_score,
      });
    } else {
      // Vector Out (Prospect) scoring - existing logic
      const inputs = await gatherHealthInputs(supabase, accountPlanId);
      const healthScore = calculateHealthScore(inputs);

      // Upsert to database
      const { data, error } = await supabase
        .from('account_health_scores')
        .upsert(
          {
            account_plan_id: accountPlanId,
            engagement_score: healthScore.engagement_score,
            momentum_score: healthScore.momentum_score,
            risk_score: healthScore.risk_score,
            intelligence_score: healthScore.intelligence_score,
            health_band: healthScore.health_band,
            score_inputs: {
              profile: 'vector_out',
              ...healthScore.score_inputs,
            },
            calculated_at: new Date().toISOString(),
          },
          {
            onConflict: 'account_plan_id',
          }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        ...data,
        profile: 'vector_out',
        total_score: healthScore.total_score,
      });
    }
  } catch (error) {
    console.error('Error calculating health score:', error);
    return NextResponse.json({ error: 'Failed to calculate health score' }, { status: 500 });
  }
}

// GET: Retrieve current health score with signal summaries
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: accountPlanId } = await params;
    const supabase = await createClient();

    // Fetch health score, account type, and signal data together
    const [healthResult, accountResult, risksResult, pursuitsResult, stakeholdersResult, sparksResult] = await Promise.all([
      supabase
        .from('account_health_scores')
        .select('*')
        .eq('account_plan_id', accountPlanId)
        .single(),
      supabase
        .from('account_plans')
        .select('account_type')
        .eq('account_plan_id', accountPlanId)
        .single(),
      // Open risks for escalation signals
      supabase
        .from('risks')
        .select('risk_id, severity, created_at, status')
        .eq('account_plan_id', accountPlanId)
        .eq('status', 'open')
        .is('deleted_at', null),
      // Pursuits for stalled deals
      supabase
        .from('pursuits')
        .select('pursuit_id, stage, updated_at')
        .eq('account_plan_id', accountPlanId)
        .not('stage', 'in', '("closed_won","closed_lost")'),
      // Stakeholders for champion mapping
      supabase
        .from('stakeholders')
        .select('stakeholder_id, sentiment, is_placeholder')
        .eq('account_plan_id', accountPlanId),
      // Trails for activity
      supabase
        .from('scout_themes')
        .select('theme_id, status, updated_at')
        .eq('account_plan_id', accountPlanId)
        .in('status', ['exploring', 'linked']),
    ]);

    if (healthResult.error && healthResult.error.code !== 'PGRST116') throw healthResult.error;

    const isCustomer = accountResult.data?.account_type === 'customer';
    const profile: ScoringProfile = isCustomer ? 'vector_in' : 'vector_out';

    // Calculate signal summaries
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const risks = risksResult.data || [];
    const pursuits = pursuitsResult.data || [];
    const stakeholders = stakeholdersResult.data || [];
    const sparks = sparksResult.data || [];

    // Vector In signals (for customers)
    const escalationRisks = risks.filter(r =>
      r.severity === 'critical' && new Date(r.created_at) < sevenDaysAgo
    ).length;
    const sentimentAlerts = stakeholders.filter(s =>
      !s.is_placeholder && (s.sentiment === 'blocker' || s.sentiment === 'skeptic')
    ).length;
    const patternWarnings = risks.filter(r => r.severity === 'high').length;

    // Vector Out signals (for prospects)
    const stalledDeals = pursuits.filter(p =>
      new Date(p.updated_at) < fourteenDaysAgo
    ).length;
    const dealsWithoutChampion = pursuits.filter(p => {
      // Check if any stakeholder is a champion for this account
      const hasChampion = stakeholders.some(s =>
        !s.is_placeholder && s.sentiment === 'champion'
      );
      return !hasChampion;
    }).length > 0 ? pursuits.length : 0; // If no champion, all deals are affected
    const inactiveTrails = sparks.filter(s =>
      new Date(s.updated_at) < fourteenDaysAgo
    ).length;

    const signalSummary = isCustomer
      ? {
          type: 'vector_in' as const,
          escalation_risks: escalationRisks,
          sentiment_alerts: sentimentAlerts,
          pattern_warnings: patternWarnings,
        }
      : {
          type: 'vector_out' as const,
          stalled_deals: stalledDeals,
          missing_champion: dealsWithoutChampion > 0 ? 1 : 0,
          inactive_trails: inactiveTrails,
        };

    if (!healthResult.data) {
      return NextResponse.json({ exists: false, signal_summary: signalSummary });
    }

    const data = healthResult.data;
    const storedProfile: ScoringProfile = (data.score_inputs as { profile?: ScoringProfile })?.profile || profile;

    // Calculate total since it's not stored
    const total_score =
      data.engagement_score + data.momentum_score + data.risk_score + data.intelligence_score;

    if (storedProfile === 'vector_in') {
      return NextResponse.json({
        ...data,
        profile: 'vector_in',
        sentiment_score: data.engagement_score,
        usage_score: data.momentum_score,
        support_score: data.risk_score,
        customer_engagement_score: data.intelligence_score,
        total_score,
        exists: true,
        signal_summary: signalSummary,
      });
    }

    return NextResponse.json({
      ...data,
      profile: 'vector_out',
      total_score,
      exists: true,
      signal_summary: signalSummary,
    });
  } catch (error) {
    console.error('Error fetching health score:', error);
    return NextResponse.json({ error: 'Failed to fetch health score' }, { status: 500 });
  }
}

// Helper function to gather inputs for health calculation
async function gatherHealthInputs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountPlanId: string
): Promise<HealthInputs> {
  // Engagement: Last contact and frequency (from completed action items)
  const { data: recentActions } = await supabase
    .from('action_items')
    .select('updated_at, status')
    .eq('account_plan_id', accountPlanId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(10);

  const lastContactDate = recentActions?.[0]?.updated_at
    ? new Date(recentActions[0].updated_at)
    : new Date(0);
  const daysSinceContact = Math.floor(
    (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contactCount30d =
    recentActions?.filter((a) => new Date(a.updated_at) > thirtyDaysAgo).length || 0;

  // Momentum: Get pursuits and check stage (simplified - no history tracking yet)
  const { data: pursuits } = await supabase
    .from('pursuits')
    .select('stage, updated_at')
    .eq('account_plan_id', accountPlanId)
    .not('stage', 'in', '("closed_won","closed_lost")');

  // Simplified: assume no movement if we can't track history
  // In production, you'd track stage history
  const stageMovement = 0;

  // Risks
  const { data: risks } = await supabase
    .from('risks')
    .select('severity, status')
    .eq('account_plan_id', accountPlanId)
    .eq('status', 'open')
    .is('deleted_at', null);

  const openRisks = risks?.length || 0;
  const criticalRisks = risks?.filter((r) => r.severity === 'critical').length || 0;

  // Intelligence: Sparks, Stakeholders, Signals
  const { data: sparks } = await supabase
    .from('scout_themes')
    .select('theme_id')
    .eq('account_plan_id', accountPlanId)
    .in('status', ['exploring', 'linked']);

  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('stakeholder_id')
    .eq('account_plan_id', accountPlanId);

  // Signals from account_signals (last 30 days)
  const { data: signals } = await supabase
    .from('account_signals')
    .select('signal_id')
    .eq('account_plan_id', accountPlanId)
    .gte('signal_date', thirtyDaysAgo.toISOString().split('T')[0]);

  const signals30d = signals?.length || 0;

  return {
    engagement: {
      days_since_contact: daysSinceContact,
      last_contact_type: 'action',
      contact_count_30d: contactCount30d,
    },
    momentum: {
      stage_30d_ago: null,
      stage_now: pursuits?.[0]?.stage || 'discovery',
      movement: stageMovement,
    },
    risk: {
      open_risks: openRisks,
      critical_risks: criticalRisks,
      risk_age_avg_days: 0, // Would calculate from risk created_at
    },
    intelligence: {
      sparks_count: sparks?.length || 0,
      stakeholders_mapped: stakeholders?.length || 0,
      signals_30d: signals30d,
    },
  };
}

// Helper function to gather inputs for Vector In (Customer) health calculation
async function gatherVectorInInputs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountPlanId: string,
  account: { nps_score?: number | null; csat_score?: number | null } | null
): Promise<VectorInHealthInputs> {
  // Engagement: Last contact and frequency (from completed action items)
  const { data: recentActions } = await supabase
    .from('action_items')
    .select('updated_at, status')
    .eq('account_plan_id', accountPlanId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(10);

  const lastContactDate = recentActions?.[0]?.updated_at
    ? new Date(recentActions[0].updated_at)
    : new Date(0);
  const daysSinceContact = Math.floor(
    (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const contactCount30d =
    recentActions?.filter((a) => new Date(a.updated_at) > thirtyDaysAgo).length || 0;

  // Support: Check for overdue risks (placeholder until Jira integration)
  const { data: risks } = await supabase
    .from('risks')
    .select('severity, status, created_at')
    .eq('account_plan_id', accountPlanId)
    .eq('status', 'open')
    .is('deleted_at', null);

  // Consider risks older than 14 days as "overdue"
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const overdueRisks = risks?.filter(r => new Date(r.created_at) < fourteenDaysAgo) || [];
  const criticalOverdue = overdueRisks.filter(r => r.severity === 'critical').length;
  const highOverdue = overdueRisks.filter(r => r.severity === 'high').length;

  return {
    sentiment: {
      nps_score: account?.nps_score ?? null,
      csat_score: account?.csat_score ?? null,
    },
    usage: {
      // Placeholder until product analytics integration
      usage_percentage: null,
    },
    support: {
      critical_overdue: criticalOverdue,
      high_overdue: highOverdue,
    },
    engagement: {
      days_since_contact: daysSinceContact,
      contact_count_30d: contactCount30d,
    },
  };
}
