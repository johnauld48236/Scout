'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ActionItem {
  status: string
  due_date: string | null
}

interface AccountPlan {
  account_plan_id: string
  account_name: string
  vertical: string | null
  account_type: string | null
  current_arr: number | null
  products_owned: string[] | null
  updated_at: string
  pursuits: { count: number }[]
  stakeholders?: { count: number }[]
  action_items?: ActionItem[]
  is_favorite: boolean
  in_weekly_review: boolean
}

interface Props {
  accountPlans: AccountPlan[]
  verticals: string[]
  accountTypes: string[]
  categories: string[]
}

type HealthStatus = 'healthy' | 'attention' | 'stale' | 'overdue' | 'incomplete'

function getHealthStatus(account: AccountPlan): HealthStatus[] {
  const statuses: HealthStatus[] = []
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const updatedAt = account.updated_at ? new Date(account.updated_at) : null

  // Check for stale (14+ days)
  if (updatedAt && updatedAt < fourteenDaysAgo) {
    statuses.push('stale')
  } else if (updatedAt && updatedAt < sevenDaysAgo) {
    statuses.push('attention')
  }

  // Check for overdue actions
  const actionItems = account.action_items || []
  if (Array.isArray(actionItems) && actionItems.length > 0) {
    const hasOverdue = actionItems.some((action) => {
      if ('due_date' in action && action.due_date && 'status' in action && action.status !== 'Completed') {
        return new Date(action.due_date) < now
      }
      return false
    })
    if (hasOverdue) {
      statuses.push('overdue')
    }
  }

  // Check for incomplete (no stakeholders AND no pursuits)
  const pursuitCount = Array.isArray(account.pursuits) && account.pursuits[0]?.count || 0
  const stakeholderCount = Array.isArray(account.stakeholders) && account.stakeholders[0]?.count || 0
  if (pursuitCount === 0 && stakeholderCount === 0) {
    statuses.push('incomplete')
  }

  return statuses
}

function HealthBadge({ status }: { status: HealthStatus }) {
  const config = {
    stale: { label: 'Stale', bg: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' },
    overdue: { label: 'Overdue', bg: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' },
    attention: { label: 'Review', bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' },
    incomplete: { label: 'Setup', bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' },
    healthy: { label: 'Active', bg: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' },
  }

  const { label, bg, color } = config[status]

  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  )
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function AccountPlansList({ accountPlans: initialAccounts, verticals, accountTypes, categories }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initialAccounts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVertical, setSelectedVertical] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showReviewOnly, setShowReviewOnly] = useState(false)

  const handleToggleFavorite = async (e: React.MouseEvent, accountId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await fetch(`/api/accounts/${accountId}/favorite`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setAccounts(accounts.map(a =>
          a.account_plan_id === accountId ? { ...a, is_favorite: data.is_favorite } : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleToggleWeeklyReview = async (e: React.MouseEvent, accountId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const response = await fetch(`/api/accounts/${accountId}/weekly-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      })
      if (response.ok) {
        const data = await response.json()
        setAccounts(accounts.map(a =>
          a.account_plan_id === accountId ? { ...a, in_weekly_review: data.in_weekly_review } : a
        ))
      }
    } catch (error) {
      console.error('Failed to toggle weekly review:', error)
    }
  }

  const filteredAccounts = useMemo(() => {
    return accounts
      .filter(account => {
        // Search filter
        if (searchQuery && !account.account_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }

        // Vertical filter
        if (selectedVertical && account.vertical !== selectedVertical) {
          return false
        }

        // Account type filter
        if (selectedType && account.account_type !== selectedType) {
          return false
        }

        // Weekly review filter
        if (showReviewOnly && !account.in_weekly_review) {
          return false
        }

        return true
      })
      // Sort: favorites first, then by name
      .sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1
        return a.account_name.localeCompare(b.account_name)
      })
  }, [accounts, searchQuery, selectedVertical, selectedType, showReviewOnly])

  const hasActiveFilters = searchQuery || selectedVertical || selectedType || selectedCategory || showReviewOnly

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedVertical('')
    setSelectedType('')
    setSelectedCategory('')
    setShowReviewOnly(false)
  }

  const reviewCount = accounts.filter(a => a.in_weekly_review).length

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Vertical Filter */}
        {verticals.length > 0 && (
          <select
            value={selectedVertical}
            onChange={(e) => setSelectedVertical(e.target.value)}
            className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Verticals</option>
            {verticals.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}

        {/* Account Type Filter */}
        {accountTypes.length > 0 && (
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {accountTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}

        {/* Category Filter (from Goals) */}
        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c === 'new_arr' ? 'New ARR' : c === 'renewal' ? 'Renewal' : c === 'upsell' ? 'Upsell' : c}</option>
            ))}
          </select>
        )}

        {/* Weekly Review Filter */}
        <button
          onClick={() => setShowReviewOnly(!showReviewOnly)}
          className={`px-3 py-1.5 text-sm border rounded-md flex items-center gap-1.5 transition-colors ${
            showReviewOnly
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          In Review ({reviewCount})
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Clear
          </button>
        )}

        {/* Results count */}
        <span className="text-xs text-zinc-500 ml-auto">
          {filteredAccounts.length} of {accounts.length}
        </span>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredAccounts.map((account) => {
          const pursuitCount = account.pursuits?.[0]?.count || 0
          // action_items is now the full array (for health calculation), so use length
          const actionCount = Array.isArray(account.action_items) ? account.action_items.length : 0
          const healthStatuses = getHealthStatus(account)

          return (
            <Link
              key={account.account_plan_id}
              href={`/accounts/${account.account_plan_id}`}
              className="block rounded-lg bg-white dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              {/* Health Status Badges */}
              {healthStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {healthStatuses.map((status) => (
                    <HealthBadge key={status} status={status} />
                  ))}
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Favorite Toggle */}
                  <button
                    onClick={(e) => handleToggleFavorite(e, account.account_plan_id)}
                    className="shrink-0 p-0.5 hover:scale-110 transition-transform"
                    title={account.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={account.is_favorite ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: account.is_favorite ? '#f59e0b' : '#9ca3af' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {account.account_name}
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Weekly Review Toggle */}
                  <button
                    onClick={(e) => handleToggleWeeklyReview(e, account.account_plan_id)}
                    className="p-0.5 hover:scale-110 transition-transform"
                    title={account.in_weekly_review ? "Remove from weekly review" : "Add to weekly review"}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={account.in_weekly_review ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: account.in_weekly_review ? '#3b82f6' : '#9ca3af' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(account.current_arr || 0)}
                  </span>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                {account.vertical && <span>{account.vertical}</span>}
                {account.vertical && account.account_type && <span>•</span>}
                {account.account_type && <span>{account.account_type}</span>}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pursuitCount} pursuits
                </span>
                <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {actionCount} actions
                </span>
              </div>

              {/* Products */}
              {account.products_owned && account.products_owned.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex flex-wrap gap-1">
                    {account.products_owned.slice(0, 3).map((product: string) => (
                      <span
                        key={product}
                        className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs"
                      >
                        {product}
                      </span>
                    ))}
                    {account.products_owned.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-zinc-500">
                        +{account.products_owned.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredAccounts.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          {hasActiveFilters
            ? 'No accounts match your filters.'
            : 'No account plans yet. Create your first one to get started.'}
        </div>
      )}
    </div>
  )
}
