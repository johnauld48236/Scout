'use client'

import { useState } from 'react'

interface Props {
  accountId: string
  initialIsFavorite: boolean
  initialInWeeklyReview: boolean
}

export function AccountHeaderToggles({ accountId, initialIsFavorite, initialInWeeklyReview }: Props) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [inWeeklyReview, setInWeeklyReview] = useState(initialInWeeklyReview)

  const handleToggleFavorite = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/favorite`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setIsFavorite(data.is_favorite)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const handleToggleWeeklyReview = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/weekly-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      })
      if (response.ok) {
        const data = await response.json()
        setInWeeklyReview(data.in_weekly_review)
      }
    } catch (error) {
      console.error('Failed to toggle weekly review:', error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Favorite Toggle */}
      <button
        onClick={handleToggleFavorite}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-all hover:scale-110"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg
          className="w-5 h-5"
          fill={isFavorite ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={isFavorite ? 0 : 1.5}
          style={{ color: isFavorite ? '#f59e0b' : 'var(--scout-earth-light)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      {/* Weekly Review Toggle */}
      <button
        onClick={handleToggleWeeklyReview}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-all hover:scale-110"
        title={inWeeklyReview ? 'Remove from weekly review' : 'Add to weekly review'}
      >
        <svg
          className="w-5 h-5"
          fill={inWeeklyReview ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={inWeeklyReview ? 0 : 1.5}
          style={{ color: inWeeklyReview ? '#3b82f6' : 'var(--scout-earth-light)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  )
}
