import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ExploreOpportunities } from '@/components/account/ExploreOpportunities'

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account
  const { data: account, error } = await supabase
    .from('account_plans')
    .select('account_plan_id, account_name, industry, website')
    .eq('account_plan_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch related data
  const [signalsRes, stakeholdersRes, divisionsRes] = await Promise.all([
    supabase
      .from('account_signals')
      .select('signal_id, summary, signal_type')
      .eq('account_plan_id', id)
      .order('signal_date', { ascending: false })
      .limit(20),
    supabase
      .from('stakeholders')
      .select('stakeholder_id, full_name, title')
      .eq('account_plan_id', id)
      .eq('is_placeholder', false)
      .limit(20),
    supabase
      .from('account_divisions')
      .select('division_id, name')
      .eq('account_plan_id', id),
  ])

  return (
    <ExploreOpportunities
      accountId={id}
      accountName={account.account_name}
      signals={signalsRes.data || []}
      stakeholders={stakeholdersRes.data || []}
      divisions={divisionsRes.data || []}
      industry={account.industry}
      website={account.website}
    />
  )
}
