import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PipelineImportButton } from '@/components/pipeline/PipelineImportButton'

function StageBadge({ stage }: { stage?: string }) {
  const colors: Record<string, string> = {
    'Discovery': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Qualification': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Proposal': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Negotiation': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Closed_Won': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Closed_Lost': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[stage || 'Discovery'] || colors['Discovery']}`}>
      {(stage || 'Discovery').replace(/_/g, ' ')}
    </span>
  )
}

export default async function PursuitsPage() {
  const supabase = await createClient()

  const [pursuitsRes, accountsRes, bantRes] = await Promise.all([
    supabase.from('pursuits').select('*').order('updated_at', { ascending: false }),
    supabase.from('account_plans').select('account_plan_id, account_name'),
    supabase.from('bant_analyses').select('pursuit_id, total_score, analysis_date').order('analysis_date', { ascending: false }),
  ])

  const pursuits = pursuitsRes.data || []
  const accounts = accountsRes.data || []
  const bantAnalyses = bantRes.data || []

  // Create account lookup map
  const accountMap = new Map(accounts.map(a => [a.account_plan_id, a.account_name]))

  // Get latest BANT score for each pursuit
  const latestBantByPursuit = new Map<string, number>()
  for (const bant of bantAnalyses) {
    if (!latestBantByPursuit.has(bant.pursuit_id)) {
      latestBantByPursuit.set(bant.pursuit_id, bant.total_score)
    }
  }

  if (pursuitsRes.error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Pursuits</h1>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Error loading pursuits: {pursuitsRes.error.message}
        </div>
      </div>
    )
  }

  // Group pursuits by stage for summary
  const stageGroups = pursuits.reduce((acc, p) => {
    const stage = p.stage || 'Discovery'
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalPipeline = pursuits.reduce((sum, p) => sum + (p.estimated_value || p.confirmed_value || 0), 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Pursuits</h1>
        <div className="flex items-center gap-4">
          <PipelineImportButton />
          <div className="text-right">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              ${totalPipeline.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Pipeline</p>
          </div>
        </div>
      </div>

      {/* Stage Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(Object.entries(stageGroups) as [string, number][]).map(([stage, count]) => (
          <div key={stage} className="flex items-center gap-2">
            <StageBadge stage={stage} />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{count}</span>
          </div>
        ))}
      </div>

      {/* Pursuits Table */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Pursuit</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Account</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Stage</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Value</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Probability</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">BANT</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Close Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {pursuits.map((pursuit) => {
              const bantScore = latestBantByPursuit.get(pursuit.pursuit_id)
              return (
                <tr key={pursuit.pursuit_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/accounts/${pursuit.account_plan_id}`}
                      className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                    >
                      {pursuit.name}
                    </Link>
                    {pursuit.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs">
                        {pursuit.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {accountMap.get(pursuit.account_plan_id) || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StageBadge stage={pursuit.stage} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    ${(pursuit.estimated_value || pursuit.confirmed_value || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {pursuit.probability || 0}%
                  </td>
                  <td className="px-4 py-3">
                    {bantScore !== undefined ? (
                      <span className={`text-sm font-medium ${
                        bantScore >= 70 ? 'text-green-600' :
                        bantScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {bantScore}/100
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {pursuit.expected_close_date
                      ? new Date(pursuit.expected_close_date).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              )
            })}
            {pursuits.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No pursuits yet. Create pursuits from account detail pages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
