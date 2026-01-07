// app/api/accounts/[id]/health/route.ts
// Account health calculation and retrieval API
// Note: [id] param is account_plan_id (our primary entity)

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  calculateHealthScore,
  type HealthInputs,
} from '@/lib/scoring/health-score';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Calculate and save health score
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: accountPlanId } = await params;
    const supabase = await createClient();

    // Gather all inputs for health calculation
    const inputs = await gatherHealthInputs(supabase, accountPlanId);

    // Calculate scores
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
          score_inputs: healthScore.score_inputs,
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
      total_score: healthScore.total_score,
    });
  } catch (error) {
    console.error('Error calculating health score:', error);
    return NextResponse.json({ error: 'Failed to calculate health score' }, { status: 500 });
  }
}

// GET: Retrieve current health score
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: accountPlanId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('account_health_scores')
      .select('*')
      .eq('account_plan_id', accountPlanId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      return NextResponse.json({ exists: false });
    }

    // Calculate total since it's not stored
    const total_score =
      data.engagement_score + data.momentum_score + data.risk_score + data.intelligence_score;

    return NextResponse.json({
      ...data,
      total_score,
      exists: true,
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
