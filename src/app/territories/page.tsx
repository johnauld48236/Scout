import { createClient } from '@/lib/supabase/server';
import Link from 'next/link'
import { AccountPlansGroupedList } from '@/components/account-plans/AccountPlansGroupedList';

export default async function TerritoriesPage() {
  const supabase = await createClient();

  // Fetch account plans (territories) with pursuit counts, stakeholder counts, action items, and sparks (trails)
  const [accountPlansRes, sparksRes, pursuitsRes] = await Promise.all([
    supabase
      .from('account_plans')
      .select(`
        *,
        pursuits:pursuits(count),
        stakeholders:stakeholders(count),
        action_items:action_items(status, due_date)
      `)
      .order('updated_at', { ascending: false }),

    // Fetch trails (sparks) grouped by account
    supabase
      .from('scout_themes')
      .select('theme_id, account_plan_id, status, size, linked_pursuit_id, converted_to_pursuit_id')
      .in('status', ['exploring', 'linked', 'converted']),

    // Fetch pursuits with values for pipeline calculation
    supabase
      .from('pursuits')
      .select('pursuit_id, account_plan_id, estimated_value, confirmed_value, stage')
      .not('stage', 'in', '("Closed_Won","Closed_Lost")'),
  ]);

  if (accountPlansRes.error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Territories</h1>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Error loading territories: {accountPlansRes.error.message}
        </div>
      </div>
    );
  }

  const accountPlans = accountPlansRes.data || [];
  const sparks = sparksRes.data || [];
  const pursuits = pursuitsRes.data || [];

  // Calculate coverage per account
  const accountsWithCoverage = accountPlans.map((account) => {
    const accountSparks = sparks.filter((s) => s.account_plan_id === account.account_plan_id);
    const activeSparks = accountSparks.filter((s) => s.status === 'exploring' || s.status === 'linked');
    const linkedSparks = accountSparks.filter((s) => s.linked_pursuit_id || s.converted_to_pursuit_id);

    const accountPursuits = pursuits.filter((p) => p.account_plan_id === account.account_plan_id);
    const pipelineValue = accountPursuits.reduce(
      (sum, p) => sum + (p.confirmed_value || p.estimated_value || 0),
      0
    );

    // Calculate spark "rating" based on size
    const sparkRating = activeSparks.reduce((score, s) => {
      if (s.size === 'high') return score + 3;
      if (s.size === 'medium') return score + 2;
      return score + 1;
    }, 0);

    // Determine coverage type
    const hasVectorOut = activeSparks.length > 0; // Has active trails (sales intelligence)
    const hasVectorIn = false; // TODO: Check for Vector In coverage when implemented

    return {
      ...account,
      sparksCount: activeSparks.length,
      linkedSparksCount: linkedSparks.length,
      pipelineValue,
      pursuitCount: accountPursuits.length,
      sparkRating: Math.min(sparkRating, 12), // Cap at 12 for 4 dots
      hasVectorOut,
      hasVectorIn,
      hasCoverage: hasVectorOut || hasVectorIn,
    };
  });

  // Extract unique values for filters
  const verticals = [...new Set(accountPlans.map((a) => a.vertical).filter(Boolean))] as string[];
  const accountTypes = [...new Set(accountPlans.map((a) => a.account_type).filter(Boolean))] as string[];

  // Calculate KPI metrics
  const totalPlans = accountsWithCoverage.length;
  const withTrails = accountsWithCoverage.filter((a) => a.sparksCount > 0).length;
  const noCoverage = accountsWithCoverage.filter((a) => !a.hasCoverage).length;
  const highValue = accountsWithCoverage.filter((a) => a.pipelineValue >= 100000).length;
  const overdueCount = accountsWithCoverage.filter((a) => {
    const actions = a.action_items || [];
    return actions.some(
      (action: { status: string; due_date: string | null }) =>
        action.status !== 'Completed' && action.due_date && new Date(action.due_date) < new Date()
    );
  }).length;
  const trailPipeline = accountsWithCoverage
    .filter((a) => a.sparksCount > 0)
    .reduce((sum, a) => sum + a.pipelineValue, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Territories</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalPlans} territories · {withTrails} with Trail coverage
          </p>
        </div>
        <Link
          href="/territories/new"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Establish Territory
        </Link>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-xl font-bold text-gray-900">{totalPlans}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">With Trails</p>
          <p className="text-xl font-bold text-amber-600">{withTrails}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">No Coverage</p>
          <p className="text-xl font-bold text-gray-400">{noCoverage}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">High Value</p>
          <p className="text-xl font-bold text-green-600">{highValue}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
          <p className="text-xl font-bold text-red-600">{overdueCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Trail Pipeline</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(trailPipeline)}</p>
        </div>
      </div>

      {/* Grouped Account List */}
      <AccountPlansGroupedList
        accounts={accountsWithCoverage}
        verticals={verticals}
        accountTypes={accountTypes}
        basePath="/territory"
        useScoutTerminology={true}
      />
    </div>
  );
}
