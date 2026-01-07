import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TAMFilters } from '@/components/TAMFilters'
import { TAMImportModal } from '@/components/TAMImportModal'
import { EnrichmentStatusBadge } from '@/components/tam/EnrichmentStatusBadge'
import { BatchEnrichButton } from '@/components/tam/BatchEnrichButton'

function FitTierBadge({ tier }: { tier?: string }) {
  const colors: Record<string, string> = {
    'A': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'B': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'C': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[tier || 'C']}`}>
      Tier {tier || '?'}
    </span>
  )
}

function PriorityScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' :
                score >= 60 ? 'text-yellow-600' : 'text-zinc-500'
  return (
    <span className={`font-semibold ${color}`}>{score}</span>
  )
}

export default async function LandscapeListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query - simplified to avoid join issues
  let query = supabase
    .from('tam_accounts')
    .select('*')
    .in('status', ['Qualified', 'Researching', 'Pursuing', 'Prospecting', 'New'])
    .order('priority_score', { ascending: false })

  // Apply filters from URL params
  if (params.vertical) {
    query = query.eq('vertical', params.vertical)
  }
  if (params.fit_tier) {
    query = query.eq('fit_tier', params.fit_tier)
  }
  if (params.min_priority) {
    query = query.gte('priority_score', parseInt(params.min_priority))
  }

  const [tamAccountsRes, campaignsRes, signalsRes, warmPathsRes, contactsRes, accountPlansRes] = await Promise.all([
    query,
    supabase.from('campaigns').select('campaign_id, name').eq('status', 'active'),
    supabase.from('account_signals').select('tam_account_id, signal_date').order('signal_date', { ascending: false }),
    supabase.from('tam_warm_paths').select('tam_account_id'),
    supabase.from('tam_contacts').select('tam_account_id'),
    // Fetch all account plans to filter out TAM accounts that already have plans
    supabase.from('account_plans').select('account_plan_id, account_name, tam_account_id'),
  ])

  // Debug: log any errors
  if (tamAccountsRes.error) {
    console.error('TAM accounts query error:', tamAccountsRes.error)
  }

  // Create set of TAM account IDs that have been converted
  const accountPlans = accountPlansRes.data || []
  const convertedTamIds = new Set(accountPlans.map(ap => ap.tam_account_id).filter(Boolean))

  // Create set of company names that already have account plans (lowercase for case-insensitive match)
  const existingAccountNames = new Set(accountPlans.map(ap => ap.account_name?.toLowerCase().trim()).filter(Boolean))

  // Filter out TAM accounts that:
  // 1. Have been directly converted (tam_account_id match)
  // 2. Have an account plan with the same company name (prevent duplicates)
  let tamAccounts = (tamAccountsRes.data || []).filter(ta => {
    // Skip if TAM account was directly converted
    if (convertedTamIds.has(ta.tam_account_id)) return false

    // Skip if an account plan exists with the same company name
    const tamCompanyName = ta.company_name?.toLowerCase().trim()
    if (tamCompanyName && existingAccountNames.has(tamCompanyName)) return false

    return true
  })
  const campaigns = campaignsRes.data || []
  const signals = signalsRes.data || []
  const warmPaths = warmPathsRes.data || []
  const contacts = contactsRes.data || []

  // Filter by campaign if specified
  if (params.campaign) {
    tamAccounts = tamAccounts.filter(t =>
      t.campaign_tam_accounts?.some((cta: { campaign_id: string }) => cta.campaign_id === params.campaign)
    )
  }

  // Get counts
  const signalDates = signals.reduce((acc, s) => {
    if (!acc[s.tam_account_id] || new Date(s.signal_date) > new Date(acc[s.tam_account_id])) {
      acc[s.tam_account_id] = s.signal_date
    }
    return acc
  }, {} as Record<string, string>)

  const warmPathCounts = warmPaths.reduce((acc, wp) => {
    acc[wp.tam_account_id] = (acc[wp.tam_account_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const contactCounts = contacts.reduce((acc, c) => {
    acc[c.tam_account_id] = (acc[c.tam_account_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Get unique verticals for filter
  const verticals = [...new Set(tamAccounts.map(t => t.vertical).filter(Boolean))]

  // Count pending enrichments
  const pendingEnrichmentCount = tamAccounts.filter(t =>
    !t.enrichment_status || t.enrichment_status === 'pending'
  ).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Landscape Accounts</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{tamAccounts.length} accounts in your landscape</p>
        </div>
        <div className="flex items-center gap-4">
          <BatchEnrichButton pendingCount={pendingEnrichmentCount} />
          <TAMImportModal />
          <Link
            href="/landscape"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>

      {/* Filters */}
      <TAMFilters
        verticals={verticals}
        campaigns={campaigns}
        currentFilters={{
          vertical: params.vertical,
          fit_tier: params.fit_tier,
          campaign: params.campaign,
          min_priority: params.min_priority,
        }}
        basePath="/landscape/list"
      />

      {/* Table */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Company</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Vertical</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Fit</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Est. Value</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Enriched</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Last Signal</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Contacts</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Warm Paths</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tamAccounts.map((account) => (
              <tr key={account.tam_account_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <Link href={`/landscape/${account.tam_account_id}`} className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600">
                    {account.company_name}
                  </Link>
                  {account.website && (
                    <p className="text-xs text-zinc-500">{account.website}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {account.vertical}
                </td>
                <td className="px-4 py-3">
                  <FitTierBadge tier={account.fit_tier} />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  ${(account.estimated_deal_value || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <PriorityScore score={account.priority_score || 0} />
                </td>
                <td className="px-4 py-3">
                  <EnrichmentStatusBadge status={account.enrichment_status} />
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {signalDates[account.tam_account_id] ? new Date(signalDates[account.tam_account_id]).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {contactCounts[account.tam_account_id] || 0}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {warmPathCounts[account.tam_account_id] || 0}
                </td>
              </tr>
            ))}
            {tamAccounts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No landscape accounts match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
