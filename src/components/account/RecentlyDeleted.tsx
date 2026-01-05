'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DeletedItem {
  id: string
  type: 'risk' | 'pain_point' | 'action'
  text: string
  severity?: string
  deletedAt: string
}

interface RecentlyDeletedProps {
  accountId: string
}

export function RecentlyDeleted({ accountId }: RecentlyDeletedProps) {
  const router = useRouter()
  const [items, setItems] = useState<DeletedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchDeletedItems()
  }, [accountId])

  const fetchDeletedItems = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/deleted`)
      if (response.ok) {
        const data = await response.json()

        // Combine and format all items
        const allItems: DeletedItem[] = [
          ...(data.risks || []).map((r: { risk_id: string; description: string; severity?: string; deleted_at: string }) => ({
            id: r.risk_id,
            type: 'risk' as const,
            text: r.description,
            severity: r.severity,
            deletedAt: r.deleted_at,
          })),
          ...(data.painPoints || []).map((p: { pain_point_id: string; description: string; severity?: string; deleted_at: string }) => ({
            id: p.pain_point_id,
            type: 'pain_point' as const,
            text: p.description,
            severity: p.severity,
            deletedAt: p.deleted_at,
          })),
          ...(data.actions || []).map((a: { action_id: string; title: string; priority?: string; deleted_at: string }) => ({
            id: a.action_id,
            type: 'action' as const,
            text: a.title,
            severity: a.priority,
            deletedAt: a.deleted_at,
          })),
        ]

        // Sort by deletion date (most recent first)
        allItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
        setItems(allItems)
      }
    } catch (error) {
      console.error('Failed to fetch deleted items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (item: DeletedItem) => {
    setIsRestoring(item.id)
    try {
      const response = await fetch(`/api/accounts/${accountId}/deleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: item.type,
          item_id: item.id,
        }),
      })

      if (response.ok) {
        // Remove from local state
        setItems(items.filter(i => i.id !== item.id))
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to restore item:', error)
    } finally {
      setIsRestoring(null)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'risk': return '⚠️'
      case 'pain_point': return '🔴'
      case 'action': return '☑️'
      default: return '📄'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'risk': return 'Risk'
      case 'pain_point': return 'Pain Point'
      case 'action': return 'Action'
      default: return 'Item'
    }
  }

  // Don't render if no deleted items
  if (isLoading || items.length === 0) {
    return null
  }

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--scout-earth-light)' }}>
            Recently Deleted
          </span>
          <span
            className="px-1.5 py-0.5 text-xs rounded-full"
            style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}
          >
            {items.length}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
          Click to restore
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {items.slice(0, 10).map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between p-2 rounded-lg group hover:bg-gray-50"
              style={{ backgroundColor: 'var(--scout-parchment)' }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm">{getTypeIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate" style={{ color: 'var(--scout-earth)' }}>
                    {item.text}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                    {getTypeLabel(item.type)} · {formatTimeAgo(item.deletedAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRestore(item)}
                disabled={isRestoring === item.id}
                className="px-2 py-1 text-xs rounded font-medium transition-colors shrink-0"
                style={{
                  backgroundColor: isRestoring === item.id ? 'var(--scout-border)' : 'rgba(93, 122, 93, 0.15)',
                  color: isRestoring === item.id ? 'var(--scout-earth-light)' : 'var(--scout-trail)',
                }}
              >
                {isRestoring === item.id ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-xs text-center py-1" style={{ color: 'var(--scout-earth-light)' }}>
              +{items.length - 10} more items
            </p>
          )}
        </div>
      )}
    </div>
  )
}
