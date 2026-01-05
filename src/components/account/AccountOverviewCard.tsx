'use client'

import { useState } from 'react'

interface AccountOverviewCardProps {
  account: {
    website?: string
    industry?: string
    employee_count?: string
    headquarters?: string
    description?: string
  }
}

export function AccountOverviewCard({ account }: AccountOverviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasData = account.website || account.industry || account.employee_count ||
                  account.headquarters || account.description

  if (!hasData) return null

  // Compact inline preview
  const previewItems = [
    account.industry,
    account.employee_count && `${account.employee_count} employees`,
    account.headquarters,
  ].filter(Boolean)

  return (
    <div className="mb-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Company Overview
          </h2>
          {!isExpanded && previewItems.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {previewItems.join(' • ')}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {account.website && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Website: </span>
                <a
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {account.website}
                </a>
              </div>
            )}
            {account.industry && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Industry: </span>
                <span className="text-zinc-900 dark:text-zinc-100">{account.industry}</span>
              </div>
            )}
            {account.employee_count && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Employees: </span>
                <span className="text-zinc-900 dark:text-zinc-100">{account.employee_count}</span>
              </div>
            )}
            {account.headquarters && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">HQ: </span>
                <span className="text-zinc-900 dark:text-zinc-100">{account.headquarters}</span>
              </div>
            )}
          </div>
          {account.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {account.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
