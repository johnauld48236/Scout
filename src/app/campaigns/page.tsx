import { createClient } from '@/lib/supabase/server';
import { CampaignDetailCard } from '@/components/campaigns/CampaignDetailCard';

export default async function StrategyPage() {
  const supabase = await createClient();

  // Fetch campaigns with related data
  const [campaignsRes, pursuitsRes, accountPlansRes, tamFitsRes, sparksRes] = await Promise.all([
    supabase.from('campaigns').select('*').order('status', { ascending: true }).order('name'),
    supabase.from('pursuits').select('pursuit_id, estimated_value, confirmed_value, account_plan_id, stage'),
    supabase.from('account_plans').select('account_plan_id, campaign_id'),
    supabase.from('campaign_tam_accounts').select('campaign_id, tam_account_id'),
    supabase.from('scout_themes').select('theme_id, campaign_id, status'),
  ]);

  const campaigns = campaignsRes.data || [];
  const pursuits = pursuitsRes.data || [];
  const accountPlans = accountPlansRes.data || [];
  const tamFits = tamFitsRes.data || [];
  const sparks = sparksRes.data || [];

  // Calculate metrics per campaign
  const campaignMetrics = campaigns.map((campaign) => {
    const campaignAccountPlans = accountPlans.filter((ap) => ap.campaign_id === campaign.campaign_id);
    const campaignPursuits = pursuits.filter((p) =>
      campaignAccountPlans.some((ap) => ap.account_plan_id === p.account_plan_id)
    );
    const activePursuits = campaignPursuits.filter(
      (p) => p.stage !== 'Closed_Won' && p.stage !== 'Closed_Lost'
    );
    const pipelineValue = activePursuits.reduce(
      (sum, p) => sum + (p.confirmed_value || p.estimated_value || 0),
      0
    );
    const tamCount = tamFits.filter((tf) => tf.campaign_id === campaign.campaign_id).length;

    // Count sparks associated with this campaign
    const campaignSparks = sparks.filter((s) => s.campaign_id === campaign.campaign_id);
    const activeSparks = campaignSparks.filter((s) => s.status === 'exploring' || s.status === 'linked');

    return {
      ...campaign,
      pipelineValue,
      pursuitCount: activePursuits.length,
      tamCount,
      sparksCount: activeSparks.length,
      accountsCount: campaignAccountPlans.length,
    };
  });

  if (campaignsRes.error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Strategy</h1>
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          Error loading campaigns: {campaignsRes.error.message}
        </div>
      </div>
    );
  }

  const activeCampaigns = campaignMetrics.filter((c) => c.status === 'active');
  const totalPipeline = activeCampaigns.reduce((sum, c) => sum + c.pipelineValue, 0);
  const totalSparks = campaignMetrics.reduce((sum, c) => sum + (c.sparksCount || 0), 0);
  const totalAccounts = new Set(accountPlans.filter((ap) => ap.campaign_id).map((ap) => ap.account_plan_id)).size;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Strategy</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define campaigns and track their execution
        </p>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Active Campaigns</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeCampaigns.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Pipeline</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sparks Active</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalSparks}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Accounts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalAccounts}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">TAM Fit</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {tamFits.length}
          </p>
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaignMetrics.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
            <p>No campaigns configured yet.</p>
            <p className="text-sm mt-1">Campaigns define the WHY, WHAT, and HOW of your sales motions.</p>
          </div>
        ) : (
          campaignMetrics.map((campaign) => (
            <CampaignDetailCard key={campaign.campaign_id} campaign={campaign} />
          ))
        )}
      </div>
    </div>
  );
}
