import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const colors: Record<string, string> = {
    'Strong_Advocate': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Supportive': 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500',
    'Neutral': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    'Skeptical': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Opponent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Unknown': 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[sentiment || 'Unknown']}`}>
      {(sentiment || 'Unknown').replace(/_/g, ' ')}
    </span>
  )
}

function RoleBadge({ role }: { role?: string }) {
  const colors: Record<string, string> = {
    'Economic_Buyer': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Technical_Buyer': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Champion': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Influencer': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Blocker': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Coach': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    'End_User': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  if (!role || role === 'Unknown') return null
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[role] || 'bg-zinc-100 text-zinc-600'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

function EngagementDot({ level }: { level?: string }) {
  const colors: Record<string, string> = {
    'High': 'bg-green-500',
    'Medium': 'bg-yellow-500',
    'Low': 'bg-orange-500',
    'None': 'bg-zinc-300 dark:bg-zinc-600',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[level || 'None']}`} />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{level || 'None'}</span>
    </div>
  )
}

export default async function StakeholdersPage() {
  const supabase = await createClient()

  const [stakeholdersRes, accountsRes] = await Promise.all([
    supabase.from('stakeholders').select('*').order('full_name', { ascending: true }),
    supabase.from('account_plans').select('account_plan_id, account_name'),
  ])

  const stakeholders = stakeholdersRes.data || []
  const accounts = accountsRes.data || []

  // Create account lookup map
  const accountMap = new Map(accounts.map(a => [a.account_plan_id, a.account_name]))

  if (stakeholdersRes.error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Stakeholders</h1>
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
          Error loading stakeholders: {stakeholdersRes.error.message}
        </div>
      </div>
    )
  }

  // Group by sentiment for summary
  const sentimentGroups = stakeholders.reduce((acc, s) => {
    const sentiment = s.sentiment || 'Unknown'
    acc[sentiment] = (acc[sentiment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Group by role type
  const roleGroups = stakeholders.reduce((acc, s) => {
    const role = s.role_type || 'Unknown'
    acc[role] = (acc[role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Stakeholders</h1>
        <p className="text-zinc-500 dark:text-zinc-400">{stakeholders.length} total</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">By Sentiment</h3>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(sentimentGroups) as [string, number][]).map(([sentiment, count]) => (
              <div key={sentiment} className="flex items-center gap-2">
                <SentimentBadge sentiment={sentiment} />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">By Role</h3>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(roleGroups) as [string, number][]).filter(([role]) => role !== 'Unknown').map(([role, count]) => (
              <div key={role} className="flex items-center gap-2">
                <RoleBadge role={role} />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stakeholders Table */}
      <div className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Account</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Sentiment</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Engagement</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Influence</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">Last Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stakeholders.map((stakeholder) => (
              <tr key={stakeholder.stakeholder_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/accounts/${stakeholder.account_plan_id}`}
                    className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600"
                  >
                    {stakeholder.full_name}
                  </Link>
                  {stakeholder.email && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {stakeholder.email}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {accountMap.get(stakeholder.account_plan_id) || '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-zinc-900 dark:text-zinc-100">{stakeholder.title || '-'}</div>
                  {stakeholder.department && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{stakeholder.department}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={stakeholder.role_type} />
                </td>
                <td className="px-4 py-3">
                  <SentimentBadge sentiment={stakeholder.sentiment} />
                </td>
                <td className="px-4 py-3">
                  <EngagementDot level={stakeholder.engagement_level} />
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {stakeholder.influence_score ? `${stakeholder.influence_score}/10` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  {stakeholder.last_contact_date
                    ? new Date(stakeholder.last_contact_date).toLocaleDateString()
                    : '-'}
                </td>
              </tr>
            ))}
            {stakeholders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No stakeholders yet. Add stakeholders from account detail pages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
