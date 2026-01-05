'use client'

import { useState } from 'react'

interface ResearchFinding {
  category: string
  title?: string
  content: string
  confidence?: string
  sources?: string[]
  status?: 'pending' | 'accepted' | 'edited' | 'rejected'
}

interface ResearchInsightsPanelProps {
  researchSummary?: string
  researchFindings?: ResearchFinding[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'Company Overview': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'Market Position': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Technology': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  'Financial Health': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  'Recent News': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'Strategic Initiatives': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'Leadership': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Challenges': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

export function ResearchInsightsPanel({ researchSummary, researchFindings = [] }: ResearchInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const hasData = researchSummary || researchFindings.length > 0

  if (!hasData) return null

  // Get unique categories
  const categories = [...new Set(researchFindings.map(f => f.category))]

  // Filter findings by category
  const filteredFindings = selectedCategory
    ? researchFindings.filter(f => f.category === selectedCategory)
    : researchFindings

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
  }

  return (
    <div className="mb-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Research Insights
          </h2>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            {researchFindings.length}
          </span>
          {!isExpanded && categories.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {categories.slice(0, 3).join(', ')}{categories.length > 3 ? '...' : ''}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {/* Research Summary */}
          {researchSummary && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-900 dark:text-blue-100">
              {researchSummary}
            </div>
          )}

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedCategory === null
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    selectedCategory === category
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}

          {/* Findings - Compact list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredFindings.map((finding, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded text-sm"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${getCategoryColor(finding.category)}`}>
                  {finding.category.split(' ')[0]}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                  {finding.title || finding.content}
                </span>
              </div>
            ))}
          </div>

          {filteredFindings.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-2">No findings</p>
          )}
        </div>
      )}
    </div>
  )
}
