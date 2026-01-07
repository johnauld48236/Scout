import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TAMDetailClient } from '@/components/tam/TAMDetailClient'

export default async function LandscapeAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch TAM account (Landscape account)
  const { data: account, error } = await supabase
    .from('tam_accounts')
    .select('*')
    .eq('tam_account_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch related data in parallel
  const [campaignFitsRes, contactsRes, warmPathsRes, campaignsRes, profileRes, accountSignalsRes, verticalSignalsRes] = await Promise.all([
    supabase
      .from('campaign_tam_accounts')
      .select('*, campaigns(*)')
      .eq('tam_account_id', id)
      .order('fit_score', { ascending: false }),
    supabase
      .from('tam_contacts')
      .select('*')
      .eq('tam_account_id', id)
      .order('full_name'),
    supabase
      .from('tam_warm_paths')
      .select('*')
      .eq('tam_account_id', id),
    supabase.from('campaigns').select('campaign_id, name, type, status, value_proposition, key_pain_points, regulatory_context, signal_triggers, target_verticals').in('status', ['active', 'planned']),
    supabase.from('company_profile').select('hubspot_config').limit(1).single(),
    // Intelligence signals matched to this specific account
    supabase
      .from('intelligence_signals')
      .select('*')
      .eq('tam_account_id', id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10),
    // Intelligence signals for this account's vertical (not matched to specific account)
    account.vertical ? supabase
      .from('intelligence_signals')
      .select('*')
      .is('tam_account_id', null)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10) : Promise.resolve({ data: [] }),
  ])

  const campaignFits = campaignFitsRes.data || []
  const contacts = contactsRes.data || []
  const warmPaths = warmPathsRes.data || []
  const allCampaigns = campaignsRes.data || []
  const accountSignals = accountSignalsRes.data || []
  const verticalSignals = (verticalSignalsRes.data || []).filter((s: { company_mentioned?: string }) => {
    // Filter vertical signals to those that might be relevant based on company name or vertical keywords
    if (!account.vertical) return false
    const summary = (s.company_mentioned || '').toLowerCase()
    const vertical = account.vertical.toLowerCase()
    return summary.includes(vertical) || vertical.includes('medical') || vertical.includes('auto')
  }).slice(0, 5)

  // Check if HubSpot is configured
  const hubspotConfig = profileRes.data?.hubspot_config
  const hasHubSpot = hubspotConfig?.enabled && hubspotConfig?.access_token

  // Ensure account has required fields with defaults
  const normalizedAccount = {
    ...account,
    vertical: account.vertical || '',
    fit_tier: account.fit_tier || 'C',
    estimated_deal_value: account.estimated_deal_value || 0,
  }

  return (
    <TAMDetailClient
      account={normalizedAccount}
      campaignFits={campaignFits}
      contacts={contacts}
      warmPaths={warmPaths}
      allCampaigns={allCampaigns}
      hasHubSpot={hasHubSpot}
      accountSignals={accountSignals}
      verticalSignals={verticalSignals}
      useScoutTerminology={true}
    />
  )
}
