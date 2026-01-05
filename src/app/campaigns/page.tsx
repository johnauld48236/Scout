import { createClient } from '@/lib/supabase/server'
import { NewCampaignButton } from '@/components/NewCampaignButton'
import { CampaignCard } from '@/components/CampaignCard'

export default async function CampaignsPage() {
  const supabase = await createClient()

  // Fetch campaigns with related data
  const [campaignsRes, pursuitsRes, accountPlansRes, tamFitsRes] = await Promise.all([
    supabase.from('campaigns').select('*').order('status', { ascending: true }).order('name'),
    supabase.from('pursuits').select('pursuit_id, estimated_value, confirmed_value, account_plan_id'),
    supabase.from('account_plans').select('account_plan_id, campaign_id'),
    supabase.from('campaign_tam_accounts').select('campaign_id, tam_account_id'),
  ])

  const campaigns = campaignsRes.data || []
  const pursuits = pursuitsRes.data || []
  const accountPlans = accountPlansRes.data || []
  const tamFits = tamFitsRes.data || []

  // Calculate metrics per campaign
  const campaignMetrics = campaigns.map(campaign => {
    const campaignAccountPlans = accountPlans.filter(ap => ap.campaign_id === campaign.campaign_id)
    const campaignPursuits = pursuits.filter(p =>
      campaignAccountPlans.some(ap => ap.account_plan_id === p.account_plan_id)
    )
    const pipelineValue = campaignPursuits.reduce((sum, p) =>
      sum + (p.confirmed_value || p.estimated_value || 0), 0
    )
    const tamCount = tamFits.filter(tf => tf.campaign_id === campaign.campaign_id).length

    return {
      ...campaign,
      pipelineValue,
      pursuitCount: campaignPursuits.length,
      tamCount,
    }
  })

  if (campaignsRes.error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Campaigns</h1>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Error loading campaigns: {campaignsRes.error.message}
        </div>
      </div>
    )
  }

  const activeCampaigns = campaignMetrics.filter(c => c.status === 'active')
  const totalPipeline = activeCampaigns.reduce((sum, c) => sum + c.pipelineValue, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Campaigns</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {activeCampaigns.length} active campaigns
          </p>
        </div>
        <NewCampaignButton />
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Campaigns</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{campaigns.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Pipeline</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">${totalPipeline.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Vertical Campaigns</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {campaigns.filter(c => c.type === 'vertical').length}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Thematic Campaigns</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {campaigns.filter(c => c.type === 'thematic').length}
          </p>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaignMetrics.map((campaign) => (
          <CampaignCard key={campaign.campaign_id} campaign={campaign} />
        ))}

        {campaigns.length === 0 && (
          <div className="col-span-3 text-center py-12 text-zinc-500 dark:text-zinc-400">
            No campaigns yet. Create your first campaign to get started.
          </div>
        )}
      </div>
    </div>
  )
}
