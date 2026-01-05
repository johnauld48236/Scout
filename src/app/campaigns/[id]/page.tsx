import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CampaignDetailClient } from '@/components/CampaignDetailClient'

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'vertical': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'thematic': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || colors['vertical']}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'planned': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    'paused': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'completed': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors['planned']}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('campaign_id', id)
    .single()

  if (error || !campaign) {
    notFound()
  }

  // Fetch related data
  const [tamFitsRes, accountPlansRes, pursuitsRes, signalsRes] = await Promise.all([
    supabase
      .from('campaign_tam_accounts')
      .select('*, tam_accounts(*)')
      .eq('campaign_id', id)
      .order('fit_score', { ascending: false }),
    supabase
      .from('account_plans')
      .select('*')
      .eq('campaign_id', id),
    supabase
      .from('pursuits')
      .select('*, account_plans!inner(campaign_id)')
      .eq('account_plans.campaign_id', id),
    supabase
      .from('account_signals')
      .select('*, tam_accounts(company_name)')
      .eq('campaign_id', id)
      .order('signal_date', { ascending: false })
      .limit(20),
  ])

  const tamFits = tamFitsRes.data || []
  const accountPlans = accountPlansRes.data || []
  const pursuits = pursuitsRes.data || []
  const signals = signalsRes.data || []

  // Calculate metrics
  const pipelineValue = pursuits.reduce((sum, p) => sum + (p.confirmed_value || p.estimated_value || 0), 0)
  const closedWon = pursuits.filter(p => p.stage === 'Closed_Won').length
  const conversionRate = pursuits.length > 0 ? (closedWon / pursuits.length) * 100 : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/campaigns" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
          ← Back to Campaigns
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{campaign.name}</h1>
              <TypeBadge type={campaign.type} />
              <StatusBadge status={campaign.status} />
            </div>
            {campaign.type === 'thematic' && campaign.start_date && (
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                {new Date(campaign.start_date).toLocaleDateString()} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
              </p>
            )}
            {campaign.type === 'vertical' && (
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">Evergreen Campaign</p>
            )}
          </div>
          <CampaignDetailClient campaign={campaign} />
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Pipeline Value</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">${pipelineValue.toLocaleString()}</p>
          {campaign.pipeline_goal && (
            <div className="mt-2">
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min((pipelineValue / campaign.pipeline_goal) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {Math.round((pipelineValue / campaign.pipeline_goal) * 100)}% of ${campaign.pipeline_goal.toLocaleString()} goal
              </p>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Pursuits</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{pursuits.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">TAM Coverage</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{tamFits.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Conversion Rate</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Overview */}
        <div className="col-span-2 space-y-6">
          {/* Target Profile */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Target Profile</h2>

            {campaign.target_verticals && campaign.target_verticals.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Verticals</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.target_verticals.map((v: string) => (
                    <span key={v} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {campaign.target_geos && campaign.target_geos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">Geographies</p>
                <div className="flex flex-wrap gap-2">
                  {campaign.target_geos.map((g: string) => (
                    <span key={g} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-sm">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {campaign.target_company_profile && (
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Company Profile</p>
                <p className="text-zinc-700 dark:text-zinc-300">{campaign.target_company_profile}</p>
              </div>
            )}
          </section>

          {/* Context */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Campaign Context</h2>

            {campaign.value_proposition && (
              <div className="mb-4">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Value Proposition</p>
                <p className="text-zinc-600 dark:text-zinc-400">{campaign.value_proposition}</p>
              </div>
            )}

            {campaign.key_pain_points && (
              <div className="mb-4">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Key Pain Points</p>
                <p className="text-zinc-600 dark:text-zinc-400">{campaign.key_pain_points}</p>
              </div>
            )}

            {campaign.signal_triggers && (
              <div className="mb-4">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Signal Triggers</p>
                <p className="text-zinc-600 dark:text-zinc-400">{campaign.signal_triggers}</p>
              </div>
            )}

            {campaign.regulatory_context && (
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Regulatory Context</p>
                <p className="text-zinc-600 dark:text-zinc-400">{campaign.regulatory_context}</p>
              </div>
            )}
          </section>

          {/* TAM Accounts */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">TAM Accounts ({tamFits.length})</h2>
              <Link href={`/tam/list?campaign=${id}`} className="text-sm text-blue-600 hover:text-blue-700">
                View All →
              </Link>
            </div>

            <div className="space-y-2">
              {tamFits.slice(0, 8).map((fit: { id: string; fit_score: number; fit_rationale: string; tam_accounts: { id: string; company_name: string; vertical: string; priority_score: number } }) => (
                <Link
                  key={fit.id}
                  href={`/tam/${fit.tam_accounts.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{fit.tam_accounts.company_name}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{fit.tam_accounts.vertical}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${
                      fit.fit_score >= 80 ? 'text-green-600' :
                      fit.fit_score >= 60 ? 'text-yellow-600' : 'text-zinc-500'
                    }`}>
                      Fit: {fit.fit_score}
                    </span>
                    <span className={`text-sm font-medium ${
                      fit.tam_accounts.priority_score >= 80 ? 'text-green-600' :
                      fit.tam_accounts.priority_score >= 60 ? 'text-yellow-600' : 'text-zinc-500'
                    }`}>
                      Priority: {fit.tam_accounts.priority_score}
                    </span>
                  </div>
                </Link>
              ))}
              {tamFits.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm py-4 text-center">No TAM accounts matched to this campaign</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Signals */}
        <div className="space-y-6">
          {/* Recent Signals */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Signals</h2>

            <div className="space-y-3">
              {signals.slice(0, 10).map((signal: { id: string; signal_type: string; signal_date: string; summary: string; tam_accounts?: { company_name: string } }) => (
                <div key={signal.id} className="border-l-2 border-blue-500 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                      {signal.signal_type}
                    </span>
                    <span className="text-xs text-zinc-500">{new Date(signal.signal_date).toLocaleDateString()}</span>
                  </div>
                  {signal.tam_accounts && (
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{signal.tam_accounts.company_name}</p>
                  )}
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{signal.summary}</p>
                </div>
              ))}
              {signals.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No signals yet</p>
              )}
            </div>
          </section>

          {/* Account Plans */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Account Plans ({accountPlans.length})</h2>

            <div className="space-y-2">
              {accountPlans.slice(0, 5).map((ap: { account_plan_id: string; account_name: string; current_arr: number }) => (
                <Link
                  key={ap.account_plan_id}
                  href={`/accounts/${ap.account_plan_id}`}
                  className="block p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{ap.account_name}</p>
                  <p className="text-sm text-zinc-500">${(ap.current_arr || 0).toLocaleString()} ARR</p>
                </Link>
              ))}
              {accountPlans.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No account plans yet</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
