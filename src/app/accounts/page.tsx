import { createClient } from '@/lib/supabase/server'
import { NewAccountButton } from '@/components/NewAccountButton'
import { AccountPlansList } from '@/components/AccountPlansList'
import { PlanHealthMetrics } from '@/components/PlanHealthMetrics'

export default async function AccountPlansPage() {
  const supabase = await createClient()

  // Fetch account plans with pursuit counts, stakeholder counts, and action items for health metrics
  const { data: accountPlans, error } = await supabase
    .from('account_plans')
    .select(`
      *,
      pursuits:pursuits(count),
      stakeholders:stakeholders(count),
      action_items:action_items(status, due_date)
    `)
    .order('updated_at', { ascending: false })

  // Fetch goals for filter options (verticals & categories)
  const { data: goals } = await supabase
    .from('goals')
    .select('vertical, category')
    .eq('is_active', true)

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Account Plans</h1>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Error loading accounts: {error.message}
        </div>
      </div>
    )
  }

  // Extract unique values for filters
  const verticals = [...new Set(accountPlans?.map(a => a.vertical).filter(Boolean))] as string[]
  const accountTypes = [...new Set(accountPlans?.map(a => a.account_type).filter(Boolean))] as string[]
  const goalVerticals = [...new Set(goals?.map(g => g.vertical).filter(Boolean))] as string[]
  const categories = [...new Set(goals?.map(g => g.category).filter(Boolean))] as string[]

  // Merge verticals from accounts and goals
  const allVerticals = [...new Set([...verticals, ...goalVerticals])]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Account Plans</h1>
        <NewAccountButton />
      </div>

      {/* Plan Health Metrics */}
      <PlanHealthMetrics accountPlans={accountPlans || []} />

      <AccountPlansList
        accountPlans={accountPlans || []}
        verticals={allVerticals}
        accountTypes={accountTypes}
        categories={categories}
      />
    </div>
  )
}
