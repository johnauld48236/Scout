import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WhiteSpaceMatrixClient } from './WhiteSpaceMatrixClient'

export const dynamic = 'force-dynamic'

export default async function WhiteSpacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account
  const { data: account, error: accountError } = await supabase
    .from('account_plans')
    .select('account_plan_id, account_name')
    .eq('account_plan_id', id)
    .single()

  if (accountError || !account) {
    notFound()
  }

  // Fetch divisions
  const { data: divisions } = await supabase
    .from('account_divisions')
    .select('*')
    .eq('account_plan_id', id)
    .order('sort_order')

  // Fetch product usage
  const { data: usage } = await supabase
    .from('division_product_usage')
    .select('*')
    .eq('account_plan_id', id)

  // Extract unique product modules
  const productModules = [...new Set(
    (usage || []).map(u => u.product_module)
  )].sort()

  return (
    <WhiteSpaceMatrixClient
      accountId={id}
      accountName={account.account_name}
      initialDivisions={divisions || []}
      initialUsage={usage || []}
      initialProducts={productModules}
    />
  )
}
