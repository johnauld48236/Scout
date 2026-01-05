import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OrgBuilderWizard } from '@/components/org-builder/OrgBuilderWizard'

export default async function OrgBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch account with all related data
  const { data: account, error } = await supabase
    .from('account_plans')
    .select('*')
    .eq('account_plan_id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  // Fetch existing stakeholders
  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('account_plan_id', id)

  // Fetch company profile for methodology
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .single()

  // Fetch pursuits for context
  const { data: pursuits } = await supabase
    .from('pursuits')
    .select('*')
    .eq('account_plan_id', id)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <OrgBuilderWizard
        account={account}
        existingStakeholders={stakeholders || []}
        companyProfile={companyProfile}
        pursuits={pursuits || []}
      />
    </div>
  )
}
