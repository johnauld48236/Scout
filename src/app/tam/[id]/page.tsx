import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TAMDetailClient } from '@/components/tam/TAMDetailClient'

export default async function TAMAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch TAM account
  const { data: account, error } = await supabase
    .from('tam_accounts')
    .select('*')
    .eq('tam_account_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch related data and HubSpot config in parallel
  const [campaignFitsRes, contactsRes, signalsRes, warmPathsRes, campaignsRes, profileRes] = await Promise.all([
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
      .from('account_signals')
      .select('*')
      .eq('tam_account_id', id)
      .order('signal_date', { ascending: false }),
    supabase
      .from('tam_warm_paths')
      .select('*')
      .eq('tam_account_id', id),
    supabase.from('campaigns').select('campaign_id, name, type, status, value_proposition, key_pain_points, regulatory_context, signal_triggers, target_verticals').in('status', ['active', 'planned']),
    supabase.from('company_profile').select('hubspot_config').limit(1).single(),
  ])

  const campaignFits = campaignFitsRes.data || []
  const contacts = contactsRes.data || []
  const signals = signalsRes.data || []
  const warmPaths = warmPathsRes.data || []
  const allCampaigns = campaignsRes.data || []

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
      signals={signals}
      warmPaths={warmPaths}
      allCampaigns={allCampaigns}
      hasHubSpot={hasHubSpot}
    />
  )
}
