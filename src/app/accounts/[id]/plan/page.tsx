import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PlanningContainer } from '@/components/planning/PlanningContainer'

export default async function PlanningPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const { id } = await params
  const { step } = await searchParams
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

  // Fetch stakeholders
  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('*')
    .eq('account_plan_id', id)
    .order('full_name')

  // Fetch pursuits
  const { data: pursuits } = await supabase
    .from('pursuits')
    .select('*')
    .eq('account_plan_id', id)
    .order('name')

  // Fetch action items
  const { data: actionItems } = await supabase
    .from('action_items')
    .select('*')
    .eq('account_plan_id', id)
    .order('due_date')

  // Fetch company profile for context
  const { data: companyProfile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .single()

  // Initial step from URL or default to 1
  const initialStep = step ? parseInt(step) : 1

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      <PlanningContainer
        account={account}
        stakeholders={stakeholders || []}
        pursuits={pursuits || []}
        actionItems={actionItems || []}
        companyProfile={companyProfile}
        initialStep={initialStep}
      />
    </div>
  )
}
