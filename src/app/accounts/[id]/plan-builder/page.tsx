import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PlanBuilder } from '@/components/account/PlanBuilder'

export default async function PlanBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account
  const { data: account, error } = await supabase
    .from('account_plans')
    .select('account_plan_id, account_name')
    .eq('account_plan_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch related data
  const [pursuitsRes, stakeholdersRes, signalsRes, actionsRes] = await Promise.all([
    supabase
      .from('pursuits')
      .select('pursuit_id, name, stage, thesis')
      .eq('account_plan_id', id),
    supabase
      .from('stakeholders')
      .select('stakeholder_id, full_name, title')
      .eq('account_plan_id', id)
      .eq('is_placeholder', false)
      .limit(20),
    supabase
      .from('account_signals')
      .select('signal_id, summary')
      .eq('account_plan_id', id)
      .order('signal_date', { ascending: false })
      .limit(15),
    supabase
      .from('action_items')
      .select('title, bucket_id')
      .eq('account_plan_id', id),
  ])

  // Transform existing actions to a simpler format
  const existingActions = (actionsRes.data || []).map(a => ({
    description: a.title,
    bucket: '30' as const, // Default bucket if not in a specific bucket
  }))

  return (
    <PlanBuilder
      accountId={id}
      accountName={account.account_name}
      pursuits={pursuitsRes.data || []}
      stakeholders={stakeholdersRes.data || []}
      signals={signalsRes.data || []}
      existingActions={existingActions}
    />
  )
}
