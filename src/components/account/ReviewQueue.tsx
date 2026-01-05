'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ReviewItem {
  item_type: 'risk' | 'pain_point' | 'action'
  item_id: string
  description: string
  severity?: string
  pursuit_id?: string
  import_source?: string
  created_at?: string
}

interface Props {
  accountId: string
  pursuits: Array<{ pursuit_id: string; name: string }>
}

export function ReviewQueue({ accountId, pursuits }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetchQueue()
  }, [accountId])

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/review-queue`)
      if (res.ok) {
        const data = await res.json()
        const allItems: ReviewItem[] = [
          ...data.risks.map((r: Record<string, unknown>) => ({
            item_type: 'risk' as const,
            item_id: r.risk_id,
            description: r.description,
            severity: r.severity,
            pursuit_id: r.pursuit_id,
            import_source: r.import_source,
            created_at: r.created_at,
          })),
          ...data.painPoints.map((p: Record<string, unknown>) => ({
            item_type: 'pain_point' as const,
            item_id: p.pain_point_id,
            description: p.description,
            severity: p.severity,
            pursuit_id: p.pursuit_id,
            import_source: p.import_source,
            created_at: p.created_at,
          })),
          ...data.actions.map((a: Record<string, unknown>) => ({
            item_type: 'action' as const,
            item_id: a.action_id,
            description: a.title,
            pursuit_id: a.pursuit_id,
            import_source: a.import_source,
            created_at: a.created_at,
          })),
        ]
        setItems(allItems)
      }
    } catch (err) {
      console.error('Failed to fetch review queue:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (item: ReviewItem, updates?: Record<string, unknown>) => {
    setProcessingIds(prev => new Set(prev).add(item.item_id))
    try {
      const res = await fetch(`/api/accounts/${accountId}/review-queue/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ item_type: item.item_type, item_id: item.item_id, updates }],
        }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.item_id !== item.item_id))
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to accept item:', err)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
    }
  }

  const handleReject = async (item: ReviewItem) => {
    setProcessingIds(prev => new Set(prev).add(item.item_id))
    try {
      const res = await fetch(`/api/accounts/${accountId}/review-queue/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ item_type: item.item_type, item_id: item.item_id }],
        }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.item_id !== item.item_id))
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to reject item:', err)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
    }
  }

  const handleReclassify = async (item: ReviewItem) => {
    const newType = item.item_type === 'risk' ? 'pain_point' : 'risk'
    setProcessingIds(prev => new Set(prev).add(item.item_id))
    try {
      const res = await fetch(`/api/accounts/${accountId}/review-queue/reclassify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: item.item_type,
          item_id: item.item_id,
          new_type: newType,
          accept: false, // Keep in queue after reclassify
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Update the item in place with new type and ID
        setItems(prev => prev.map(i => {
          if (i.item_id === item.item_id) {
            return {
              ...i,
              item_type: newType as 'risk' | 'pain_point',
              item_id: data.newItem.risk_id || data.newItem.pain_point_id,
            }
          }
          return i
        }))
      }
    } catch (err) {
      console.error('Failed to reclassify item:', err)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
    }
  }

  const handleAcceptAll = async () => {
    setProcessingIds(new Set(items.map(i => i.item_id)))
    try {
      const res = await fetch(`/api/accounts/${accountId}/review-queue/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ item_type: i.item_type, item_id: i.item_id })),
        }),
      })
      if (res.ok) {
        setItems([])
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to accept all:', err)
    } finally {
      setProcessingIds(new Set())
    }
  }

  const startEdit = (item: ReviewItem) => {
    setEditingId(item.item_id)
    setEditValue(item.description)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = (item: ReviewItem) => {
    if (editValue.trim() && editValue !== item.description) {
      handleAccept(item, { description: editValue.trim() })
    } else {
      handleAccept(item)
    }
    setEditingId(null)
    setEditValue('')
  }

  // Don't show anything while loading or if no items
  if (isLoading) return null
  if (items.length === 0) return null

  const riskCount = items.filter(i => i.item_type === 'risk').length
  const painPointCount = items.filter(i => i.item_type === 'pain_point').length
  const actionCount = items.filter(i => i.item_type === 'action').length

  const getPursuitName = (pursuitId?: string) => {
    if (!pursuitId) return null
    const pursuit = pursuits.find(p => p.pursuit_id === pursuitId)
    return pursuit?.name
  }

  const getTypeLabel = (type: 'risk' | 'pain_point' | 'action') => {
    switch (type) {
      case 'risk': return 'Risk'
      case 'pain_point': return 'Pain Point'
      case 'action': return 'Action'
    }
  }

  const getTypeColor = (type: 'risk' | 'pain_point' | 'action') => {
    switch (type) {
      case 'risk': return { bg: 'rgba(169, 68, 66, 0.1)', text: 'var(--scout-clay)' }
      case 'pain_point': return { bg: 'rgba(210, 105, 30, 0.1)', text: 'var(--scout-sunset)' }
      case 'action': return { bg: 'rgba(93, 122, 93, 0.1)', text: 'var(--scout-trail)' }
    }
  }

  return (
    <div
      className="rounded-xl border-2 overflow-hidden mb-6"
      style={{
        borderColor: 'var(--scout-sunset)',
        backgroundColor: 'rgba(210, 105, 30, 0.05)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        style={{ backgroundColor: 'rgba(210, 105, 30, 0.1)' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--scout-sunset)', color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
              Review Queue
            </h3>
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              {items.length} imported item{items.length !== 1 ? 's' : ''} need review
              {riskCount > 0 && ` · ${riskCount} risk${riskCount !== 1 ? 's' : ''}`}
              {painPointCount > 0 && ` · ${painPointCount} pain point${painPointCount !== 1 ? 's' : ''}`}
              {actionCount > 0 && ` · ${actionCount} action${actionCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleAcceptAll() }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ backgroundColor: 'var(--scout-trail)' }}
            disabled={processingIds.size > 0}
          >
            Accept All
          </button>
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--scout-white)' }}>
          {items.map((item) => {
            const isProcessing = processingIds.has(item.item_id)
            const isEditing = editingId === item.item_id
            const typeColor = getTypeColor(item.item_type)
            const pursuitName = getPursuitName(item.pursuit_id)

            return (
              <div
                key={`${item.item_type}-${item.item_id}`}
                className={`p-3 rounded-lg border flex items-start gap-3 ${isProcessing ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--scout-border)' }}
              >
                {/* Type badge */}
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ backgroundColor: typeColor.bg, color: typeColor.text }}
                >
                  {getTypeLabel(item.item_type)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        style={{ borderColor: 'var(--scout-border)' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <button
                        onClick={() => saveEdit(item)}
                        className="px-2 py-1 text-xs font-medium rounded text-white"
                        style={{ backgroundColor: 'var(--scout-trail)' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{ color: 'var(--scout-earth-light)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                        {item.description}
                      </p>
                      {pursuitName && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scout-sky)' }}>
                          {pursuitName}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reclassify button (only for risk/pain_point) */}
                    {(item.item_type === 'risk' || item.item_type === 'pain_point') && (
                      <button
                        onClick={() => handleReclassify(item)}
                        disabled={isProcessing}
                        className="p-1.5 rounded hover:bg-gray-100"
                        title={`Change to ${item.item_type === 'risk' ? 'Pain Point' : 'Risk'}`}
                      >
                        <svg className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => startEdit(item)}
                      disabled={isProcessing}
                      className="p-1.5 rounded hover:bg-gray-100"
                      title="Edit before accepting"
                    >
                      <svg className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Accept button */}
                    <button
                      onClick={() => handleAccept(item)}
                      disabled={isProcessing}
                      className="p-1.5 rounded hover:bg-green-50"
                      title="Accept"
                    >
                      <svg className="w-4 h-4" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>

                    {/* Reject button */}
                    <button
                      onClick={() => handleReject(item)}
                      disabled={isProcessing}
                      className="p-1.5 rounded hover:bg-red-50"
                      title="Reject"
                    >
                      <svg className="w-4 h-4" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
