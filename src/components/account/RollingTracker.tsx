'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MultiDealSelector } from './MultiDealSelector'
import { PlanningWizard } from './PlanningWizard'

interface Milestone {
  id: string
  text: string
  completed: boolean
}

interface PainPoint {
  pain_point_id: string
  description: string
  severity?: string
  status?: string
  target_date?: string | null
  date_type?: 'explicit' | 'soft'
  pursuit_id?: string | null
  pursuits?: { name: string } | null
}

interface Risk {
  risk_id: string
  description: string
  severity?: string
  status?: string
  target_date?: string | null
  date_type?: 'explicit' | 'soft'
  pursuit_id?: string | null
}

interface Pursuit {
  pursuit_id: string
  name: string
  estimated_value?: number
  stage?: string
}

interface Bucket {
  bucket_id: string
  name: string
  description?: string
  instructions?: string
  target_date?: string | null
  pursuit_id?: string | null
  pursuit_ids?: string[]
  importance?: string
  color: string
  status: string
}

interface BucketItem {
  bucket_id: string
  item_type: 'risk' | 'pain_point' | 'action' | 'milestone'
  item_id: string
}

interface CompellingEvent {
  event: string
  date?: string
  impact?: 'high' | 'medium' | 'low'
}

interface BuyingSignal {
  signal: string
  type?: string
  strength?: 'strong' | 'moderate' | 'weak'
}

interface ResearchFinding {
  id?: string
  category: string
  content: string
}

interface BANTScore {
  budget_score: number
  authority_score: number
  need_score: number
  timeline_score: number
}

interface AccountIntelligence {
  accountThesis?: string
  compellingEvents?: CompellingEvent[]
  buyingSignals?: BuyingSignal[]
  researchFindings?: ResearchFinding[]
  campaignName?: string
  campaignContext?: string
  vertical?: string
  bantByPursuit?: Map<string, BANTScore>
}

interface RollingTrackerProps {
  accountPlanId: string
  accountName?: string
  painPoints: PainPoint[]
  risks: Risk[]
  milestones: {
    day_30: Milestone[]
    day_60: Milestone[]
    day_90: Milestone[]
  }
  pursuits: Pursuit[]
  buckets?: Bucket[]
  bucketItems?: BucketItem[]
  bantGaps?: string[]
  accountIntelligence?: AccountIntelligence
}

type Period = 'day_30' | 'day_60' | 'day_90' | 'day_90_plus'
type MilestonePeriod = 'day_30' | 'day_60' | 'day_90'

interface TrackerItem {
  id: string
  type: 'milestone' | 'risk' | 'pain_point'
  text: string
  completed?: boolean
  severity?: string
  isOverdue?: boolean  // explicit date past due
  isRolled?: boolean   // soft date past due
  dateType?: 'explicit' | 'soft'
  targetDate?: string | null
  bucketIds?: string[]
}

function getBucket(targetDate: string | null | undefined): Period | 'undated' | 'past' {
  if (!targetDate) return 'undated'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const daysDiff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return 'past'
  if (daysDiff <= 30) return 'day_30'
  if (daysDiff <= 60) return 'day_60'
  if (daysDiff <= 90) return 'day_90'
  return 'day_90_plus'
}

function getDaysOverdue(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDateForPeriod(period: Period): string {
  const today = new Date()
  const daysToAdd = period === 'day_30' ? 15 : period === 'day_60' ? 45 : period === 'day_90' ? 75 : 120
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() + daysToAdd)
  return targetDate.toISOString().split('T')[0]
}

const BUCKET_COLORS: Record<string, string> = {
  blue: 'var(--scout-sky)',
  green: 'var(--scout-trail)',
  orange: 'var(--scout-sunset)',
  red: 'var(--scout-clay)',
  purple: '#8B5CF6',
  gray: 'var(--scout-earth-light)',
}

export function RollingTracker({
  accountPlanId,
  accountName = 'Account',
  painPoints,
  risks,
  milestones,
  pursuits,
  buckets = [],
  bucketItems = [],
  bantGaps = [],
  accountIntelligence = {},
}: RollingTrackerProps) {
  const router = useRouter()
  const [expandedPeriod, setExpandedPeriod] = useState<Period | string | null>('day_30')
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: string } | null>(null)
  const [dropTarget, setDropTarget] = useState<Period | string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingItem, setEditingItem] = useState<{ id: string; type: string; text: string } | null>(null)
  const [showBucketModal, setShowBucketModal] = useState(false)
  const [showPlanningWizard, setShowPlanningWizard] = useState(false)
  const [scheduleExpanded, setScheduleExpanded] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketDescription, setNewBucketDescription] = useState('')
  const [newBucketInstructions, setNewBucketInstructions] = useState('')
  const [newBucketDueDate, setNewBucketDueDate] = useState('')
  const [newBucketImportance, setNewBucketImportance] = useState('medium')
  const [newBucketColor, setNewBucketColor] = useState('blue')
  const [newBucketPursuitIds, setNewBucketPursuitIds] = useState<string[]>([])
  const [editingBucket, setEditingBucket] = useState<Bucket | null>(null)
  const [editBucketPursuitIds, setEditBucketPursuitIds] = useState<string[]>([])
  const [openAssignDropdown, setOpenAssignDropdown] = useState<string | null>(null)
  const [expandedBucketInPeriod, setExpandedBucketInPeriod] = useState<string | null>(null)

  // Get bucket IDs for an item
  const getItemBucketIds = (itemType: string, itemId: string): string[] => {
    return bucketItems
      .filter(bi => bi.item_type === itemType && bi.item_id === itemId)
      .map(bi => bi.bucket_id)
  }

  // Aggregate items into buckets
  const timeBuckets: Record<Period | 'undated' | 'overdue' | 'rolled', TrackerItem[]> = {
    day_30: [], day_60: [], day_90: [], day_90_plus: [], undated: [], overdue: [], rolled: [],
  }

  // Add milestones
  ;(['day_30', 'day_60', 'day_90'] as const).forEach(period => {
    milestones[period].forEach(m => {
      timeBuckets[period].push({
        id: m.id, type: 'milestone', text: m.text, completed: m.completed,
        bucketIds: getItemBucketIds('milestone', m.id),
      })
    })
  })

  // Add pain points (only those with target_date)
  painPoints.filter(pp => pp.status !== 'addressed' && pp.target_date).forEach(pp => {
    const bucket = getBucket(pp.target_date)
    const dateType = pp.date_type || 'explicit'
    const isPast = bucket === 'past'

    const item: TrackerItem = {
      id: pp.pain_point_id, type: 'pain_point', text: pp.description,
      severity: pp.severity,
      isOverdue: isPast && dateType === 'explicit',
      isRolled: isPast && dateType === 'soft',
      dateType,
      targetDate: pp.target_date,
      bucketIds: getItemBucketIds('pain_point', pp.pain_point_id),
    }

    if (isPast) {
      // Explicit past-due = overdue, soft past-due = rolled
      timeBuckets[dateType === 'explicit' ? 'overdue' : 'rolled'].push(item)
    } else {
      timeBuckets[bucket].push(item)
    }
  })

  // Add risks (only those with target_date)
  risks.filter(r => r.status === 'open' && r.target_date).forEach(r => {
    const bucket = getBucket(r.target_date)
    const dateType = r.date_type || 'explicit'
    const isPast = bucket === 'past'

    const item: TrackerItem = {
      id: r.risk_id, type: 'risk', text: r.description,
      severity: r.severity,
      isOverdue: isPast && dateType === 'explicit',
      isRolled: isPast && dateType === 'soft',
      dateType,
      targetDate: r.target_date,
      bucketIds: getItemBucketIds('risk', r.risk_id),
    }

    if (isPast) {
      timeBuckets[dateType === 'explicit' ? 'overdue' : 'rolled'].push(item)
    } else {
      timeBuckets[bucket].push(item)
    }
  })

  // Undated items - exclude items already tagged to a custom bucket
  painPoints.filter(pp => pp.status !== 'addressed' && !pp.target_date).forEach(pp => {
    const itemBuckets = getItemBucketIds('pain_point', pp.pain_point_id)
    // Only show in "Schedule These" if not tagged to any custom bucket
    if (itemBuckets.length === 0) {
      timeBuckets.undated.push({
        id: pp.pain_point_id, type: 'pain_point', text: pp.description, severity: pp.severity,
        bucketIds: itemBuckets,
      })
    }
  })
  risks.filter(r => r.status === 'open' && !r.target_date).forEach(r => {
    const itemBuckets = getItemBucketIds('risk', r.risk_id)
    // Only show in "Schedule These" if not tagged to any custom bucket
    if (itemBuckets.length === 0) {
      timeBuckets.undated.push({
        id: r.risk_id, type: 'risk', text: r.description, severity: r.severity,
        bucketIds: itemBuckets,
      })
    }
  })

  // Group buckets by period (for buckets with target_date)
  const bucketsByPeriod: Record<Period, Bucket[]> = { day_30: [], day_60: [], day_90: [], day_90_plus: [] }
  const undatedBuckets: Bucket[] = []
  buckets.filter(b => b.status === 'active').forEach(b => {
    if (b.target_date) {
      const period = getBucket(b.target_date)
      if (period !== 'undated' && period !== 'past') {
        bucketsByPeriod[period].push(b)
      } else if (period === 'past') {
        // Overdue buckets go to day_30
        bucketsByPeriod.day_30.push(b)
      } else {
        undatedBuckets.push(b)
      }
    } else {
      undatedBuckets.push(b)
    }
  })

  // Group items by custom bucket
  const customBucketItems: Record<string, TrackerItem[]> = {}
  buckets.filter(b => b.status === 'active').forEach(b => {
    customBucketItems[b.bucket_id] = []
    bucketItems.filter(bi => bi.bucket_id === b.bucket_id).forEach(bi => {
      // Find the actual item
      if (bi.item_type === 'risk') {
        const risk = risks.find(r => r.risk_id === bi.item_id)
        if (risk && risk.status === 'open') {
          customBucketItems[b.bucket_id].push({
            id: risk.risk_id, type: 'risk', text: risk.description,
            severity: risk.severity, bucketIds: getItemBucketIds('risk', risk.risk_id),
          })
        }
      } else if (bi.item_type === 'pain_point') {
        const pp = painPoints.find(p => p.pain_point_id === bi.item_id)
        if (pp && pp.status !== 'addressed') {
          customBucketItems[b.bucket_id].push({
            id: pp.pain_point_id, type: 'pain_point', text: pp.description,
            severity: pp.severity, bucketIds: getItemBucketIds('pain_point', pp.pain_point_id),
          })
        }
      } else if (bi.item_type === 'milestone') {
        const allMilestones = [...milestones.day_30, ...milestones.day_60, ...milestones.day_90]
        const m = allMilestones.find(ms => ms.id === bi.item_id)
        if (m) {
          customBucketItems[b.bucket_id].push({
            id: m.id, type: 'milestone', text: m.text, completed: m.completed,
            bucketIds: getItemBucketIds('milestone', m.id),
          })
        }
      }
    })
  })

  const handleDateChange = useCallback(async (
    itemId: string,
    itemType: string,
    newDate: string,
    dateType: 'explicit' | 'soft' = 'soft'
  ) => {
    setIsUpdating(true)
    try {
      const endpoint = itemType === 'risk'
        ? `/api/accounts/${accountPlanId}/risks/${itemId}`
        : `/api/accounts/${accountPlanId}/pain-points/${itemId}`
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: newDate, date_type: dateType }),
      })
      if (response.ok) router.refresh()
    } catch (error) {
      console.error('Failed to update date:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [accountPlanId, router])

  // Accept rollover - move soft past-due item forward 30 days
  const handleAcceptRollover = useCallback(async (item: TrackerItem) => {
    const today = new Date()
    today.setDate(today.getDate() + 30)
    const newDate = today.toISOString().split('T')[0]
    await handleDateChange(item.id, item.type, newDate, 'soft')
  }, [handleDateChange])

  // Accept all rolled items
  const handleAcceptAllRolled = useCallback(async () => {
    setIsUpdating(true)
    try {
      const today = new Date()
      today.setDate(today.getDate() + 30)
      const newDate = today.toISOString().split('T')[0]

      await Promise.all(
        timeBuckets.rolled.map(item => {
          const endpoint = item.type === 'risk'
            ? `/api/accounts/${accountPlanId}/risks/${item.id}`
            : `/api/accounts/${accountPlanId}/pain-points/${item.id}`
          return fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_date: newDate, date_type: 'soft' }),
          })
        })
      )
      router.refresh()
    } catch (error) {
      console.error('Failed to accept rollovers:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [accountPlanId, router, timeBuckets.rolled])

  const handleMilestoneToggle = async (period: MilestonePeriod, milestoneId: string, currentCompleted: boolean) => {
    const updatedMilestones = {
      ...milestones,
      [period]: milestones[period].map(m =>
        m.id === milestoneId ? { ...m, completed: !currentCompleted } : m
      ),
    }
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestones: updatedMilestones }),
      })
      if (response.ok) router.refresh()
    } catch (error) {
      console.error('Failed to update milestone:', error)
    }
  }

  const handleDeleteItem = async (item: TrackerItem) => {
    if (!confirm(`Delete this ${item.type.replace('_', ' ')}?`)) return
    setIsUpdating(true)
    try {
      if (item.type === 'milestone') {
        // Find which period the milestone is in
        for (const period of ['day_30', 'day_60', 'day_90'] as const) {
          if (milestones[period].some(m => m.id === item.id)) {
            const updatedMilestones = {
              ...milestones,
              [period]: milestones[period].filter(m => m.id !== item.id),
            }
            await fetch(`/api/accounts/${accountPlanId}/plan`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ milestones: updatedMilestones }),
            })
            break
          }
        }
      } else {
        const endpoint = item.type === 'risk'
          ? `/api/accounts/${accountPlanId}/risks/${item.id}`
          : `/api/accounts/${accountPlanId}/pain-points/${item.id}`
        await fetch(endpoint, { method: 'DELETE' })
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    setIsUpdating(true)
    try {
      if (editingItem.type === 'milestone') {
        for (const period of ['day_30', 'day_60', 'day_90'] as const) {
          if (milestones[period].some(m => m.id === editingItem.id)) {
            const updatedMilestones = {
              ...milestones,
              [period]: milestones[period].map(m =>
                m.id === editingItem.id ? { ...m, text: editingItem.text } : m
              ),
            }
            await fetch(`/api/accounts/${accountPlanId}/plan`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ milestones: updatedMilestones }),
            })
            break
          }
        }
      } else {
        const endpoint = editingItem.type === 'risk'
          ? `/api/accounts/${accountPlanId}/risks/${editingItem.id}`
          : `/api/accounts/${accountPlanId}/pain-points/${editingItem.id}`
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: editingItem.text }),
        })
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsUpdating(false)
      setEditingItem(null)
    }
  }

  const handleTagToBucket = async (item: TrackerItem, bucketId: string, isTagged: boolean) => {
    setIsUpdating(true)
    try {
      if (isTagged) {
        // Remove tag
        await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}/items?item_type=${item.type}&item_id=${item.id}`, {
          method: 'DELETE',
        })
      } else {
        // Add tag
        await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_type: item.type, item_id: item.id }),
        })
      }
      router.refresh()
    } catch (error) {
      console.error('Failed to update tag:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateBucket = async () => {
    if (!newBucketName.trim()) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/accounts/${accountPlanId}/buckets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBucketName.trim(),
          description: newBucketDescription.trim() || null,
          instructions: newBucketInstructions.trim() || null,
          target_date: newBucketDueDate || null,
          importance: newBucketImportance,
          color: newBucketColor,
        }),
      })

      // If multi-deal selected, update the junction table
      if (res.ok && newBucketPursuitIds.length > 0) {
        const data = await res.json()
        await fetch(`/api/accounts/${accountPlanId}/buckets/${data.bucket.bucket_id}/pursuits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pursuit_ids: newBucketPursuitIds }),
        })
      }

      // Reset form
      setNewBucketName('')
      setNewBucketDescription('')
      setNewBucketInstructions('')
      setNewBucketDueDate('')
      setNewBucketImportance('medium')
      setNewBucketColor('blue')
      setNewBucketPursuitIds([])
      setShowBucketModal(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to create bucket:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateBucket = async () => {
    if (!editingBucket || !editingBucket.name.trim()) return
    setIsUpdating(true)
    try {
      await fetch(`/api/accounts/${accountPlanId}/buckets/${editingBucket.bucket_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBucket.name.trim(),
          description: editingBucket.description?.trim() || null,
          instructions: editingBucket.instructions?.trim() || null,
          target_date: editingBucket.target_date || null,
          importance: editingBucket.importance || 'medium',
          color: editingBucket.color,
        }),
      })

      // Update linked deals
      await fetch(`/api/accounts/${accountPlanId}/buckets/${editingBucket.bucket_id}/pursuits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pursuit_ids: editBucketPursuitIds }),
      })

      setEditingBucket(null)
      setEditBucketPursuitIds([])
      router.refresh()
    } catch (error) {
      console.error('Failed to update bucket:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const startEditingBucket = (bucket: Bucket) => {
    setEditingBucket({ ...bucket })
    setEditBucketPursuitIds(bucket.pursuit_ids || (bucket.pursuit_id ? [bucket.pursuit_id] : []))
  }

  const handleDeleteBucket = async (bucketId: string) => {
    if (!confirm('Delete this bucket? Items will be untagged but not deleted.')) return
    setIsUpdating(true)
    try {
      await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}`, { method: 'DELETE' })
      router.refresh()
    } catch (error) {
      console.error('Failed to delete bucket:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: TrackerItem) => {
    if (item.type === 'milestone') return
    setDraggedItem({ id: item.id, type: item.type })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDropOnPeriod = async (e: React.DragEvent, period: Period) => {
    e.preventDefault()
    setDropTarget(null)
    if (!draggedItem || draggedItem.type === 'milestone') return
    await handleDateChange(draggedItem.id, draggedItem.type, getDateForPeriod(period))
    setDraggedItem(null)
  }

  const handleDropOnBucket = async (e: React.DragEvent, bucketId: string) => {
    e.preventDefault()
    setDropTarget(null)
    if (!draggedItem) return

    // Tag the item to this bucket
    await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: draggedItem.type, item_id: draggedItem.id }),
    })
    setDraggedItem(null)
    router.refresh()
  }

  const periodCounts: Record<Period, number> = {
    day_30: timeBuckets.day_30.length + bucketsByPeriod.day_30.length,
    day_60: timeBuckets.day_60.length + bucketsByPeriod.day_60.length,
    day_90: timeBuckets.day_90.length + bucketsByPeriod.day_90.length,
    day_90_plus: timeBuckets.day_90_plus.length + bucketsByPeriod.day_90_plus.length,
  }

  const overdueCount = timeBuckets.overdue.length
  const rolledCount = timeBuckets.rolled.length

  const totalDated = periodCounts.day_30 + periodCounts.day_60 + periodCounts.day_90 + periodCounts.day_90_plus
  const completedMilestones = [...milestones.day_30, ...milestones.day_60, ...milestones.day_90].filter(m => m.completed).length
  const totalMilestones = milestones.day_30.length + milestones.day_60.length + milestones.day_90.length

  // Count buckets by status
  const activeBucketCount = buckets.filter(b => b.status === 'active').length
  const completedBucketCount = buckets.filter(b => b.status === 'completed').length

  const renderItem = (item: TrackerItem, period: Period | string, showTagButton = true) => {
    const isMilestone = item.type === 'milestone'
    const typeIcon = item.type === 'risk' ? '⚠️' : item.type === 'pain_point' ? '🔴' : null
    const borderColor = item.type === 'milestone' ? 'var(--scout-trail)'
      : item.type === 'risk' ? 'var(--scout-clay)' : 'var(--scout-sunset)'

    // Check if editing this item
    if (editingItem && editingItem.id === item.id) {
      return (
        <div
          key={`${item.type}-${item.id}`}
          className="flex items-center gap-2 py-1.5 px-2 rounded"
          style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: 'var(--scout-white)' }}
        >
          <input
            type="text"
            value={editingItem.text}
            onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
            className="flex-1 text-xs p-1 border rounded"
            style={{ borderColor: 'var(--scout-border)' }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') setEditingItem(null)
            }}
          />
          <button onClick={handleSaveEdit} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-trail)', color: 'white' }}>
            Save
          </button>
          <button onClick={() => setEditingItem(null)} className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            Cancel
          </button>
        </div>
      )
    }

    return (
      <div
        key={`${item.type}-${item.id}`}
        draggable={!isMilestone}
        onDragStart={(e) => handleDragStart(e, item)}
        className={`group flex items-start gap-2 py-1.5 px-2 rounded text-sm ${!isMilestone ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {isMilestone ? (
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => handleMilestoneToggle(period as MilestonePeriod, item.id, item.completed || false)}
            className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
            style={{ accentColor: 'var(--scout-trail)' }}
          />
        ) : (
          <span className="flex-shrink-0 text-xs">{typeIcon}</span>
        )}
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs ${isMilestone && item.completed ? 'line-through opacity-60' : ''}`}
            style={{ color: 'var(--scout-earth)' }}
          >
            {item.text}
          </span>
          {/* Bucket tags */}
          {item.bucketIds && item.bucketIds.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {item.bucketIds.map(bid => {
                const bucket = buckets.find(b => b.bucket_id === bid)
                if (!bucket) return null
                return (
                  <span
                    key={bid}
                    className="text-[9px] px-1 py-0.5 rounded"
                    style={{ backgroundColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}20`, color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                  >
                    {bucket.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>
        {/* Date badge with explicit vs soft styling */}
        {item.targetDate && !item.isOverdue && !item.isRolled && (
          item.dateType === 'explicit' ? (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 flex-shrink-0">
              {formatDate(item.targetDate)}
            </span>
          ) : (
            <span className="text-[9px] italic px-1.5 py-0.5 text-gray-500 flex-shrink-0">
              ~{formatDate(item.targetDate)}
            </span>
          )
        )}
        {item.isOverdue && item.targetDate && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">
            {getDaysOverdue(item.targetDate)}d overdue
          </span>
        )}
        {item.isRolled && item.targetDate && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
            Rolled
          </span>
        )}
        {/* Action buttons - hover reveal */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditingItem({ id: item.id, type: item.type, text: item.text })}
            className="p-0.5 rounded hover:bg-gray-100"
            title="Edit"
          >
            <svg className="w-3 h-3" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteItem(item)}
            className="p-0.5 rounded hover:bg-red-100"
            title="Delete"
          >
            <svg className="w-3 h-3" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {showTagButton && !isMilestone && (
            <div className="relative">
              <button
                onClick={() => setOpenAssignDropdown(openAssignDropdown === `item-${item.id}` ? null : `item-${item.id}`)}
                className="p-0.5 rounded hover:bg-blue-100"
                title="Move/Reassign"
              >
                <svg className="w-3 h-3" style={{ color: 'var(--scout-sky)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              {openAssignDropdown === `item-${item.id}` && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenAssignDropdown(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border rounded shadow-lg z-20 min-w-[140px]" style={{ borderColor: 'var(--scout-border)' }}>
                    {/* Time window options */}
                    <div className="px-2 py-1 text-[9px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                      Move to
                    </div>
                    <button
                      onClick={() => {
                        handleDateChange(item.id, item.type, getDateForPeriod('day_30'))
                        setOpenAssignDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: 'var(--scout-earth)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-clay)' }} />
                      30 Days
                    </button>
                    <button
                      onClick={() => {
                        handleDateChange(item.id, item.type, getDateForPeriod('day_60'))
                        setOpenAssignDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: 'var(--scout-earth)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-sunset)' }} />
                      60 Days
                    </button>
                    <button
                      onClick={() => {
                        handleDateChange(item.id, item.type, getDateForPeriod('day_90'))
                        setOpenAssignDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: 'var(--scout-earth)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-trail)' }} />
                      90 Days
                    </button>
                    <button
                      onClick={() => {
                        handleDateChange(item.id, item.type, getDateForPeriod('day_90_plus'))
                        setOpenAssignDropdown(null)
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                      style={{ color: 'var(--scout-earth)' }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-earth-light)' }} />
                      90+ Days
                    </button>
                    {/* Buckets */}
                    {buckets.filter(b => b.status === 'active').length > 0 && (
                      <>
                        <div className="border-t my-1" style={{ borderColor: 'var(--scout-border)' }} />
                        <div className="px-2 py-1 text-[9px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                          Tag to bucket
                        </div>
                        {buckets.filter(b => b.status === 'active').map(bucket => {
                          const isTagged = item.bucketIds?.includes(bucket.bucket_id)
                          return (
                            <button
                              key={bucket.bucket_id}
                              onClick={() => {
                                handleTagToBucket(item, bucket.bucket_id, !!isTagged)
                                setOpenAssignDropdown(null)
                              }}
                              className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                              style={{ color: 'var(--scout-earth)' }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                              />
                              <span className="flex-1 truncate">{bucket.name}</span>
                              {isTagged && <span className="text-green-600 text-[10px]">✓</span>}
                            </button>
                          )
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render item in the Schedule These expanded view with full controls
  const renderScheduleItem = (item: TrackerItem) => {
    const typeIcon = item.type === 'risk' ? '⚠️' : '🔴'
    const bgColor = item.type === 'risk' ? 'rgba(169, 68, 66, 0.08)' : 'rgba(210, 105, 30, 0.08)'
    const borderColor = item.type === 'risk' ? 'var(--scout-clay)' : 'var(--scout-sunset)'

    // Check if editing this item
    if (editingItem && editingItem.id === item.id) {
      return (
        <div
          key={`schedule-${item.type}-${item.id}`}
          className="flex flex-col gap-1.5 p-2 rounded"
          style={{ backgroundColor: 'var(--scout-white)', border: `1px solid ${borderColor}` }}
        >
          <textarea
            value={editingItem.text}
            onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
            className="w-full text-xs p-1.5 border rounded resize-none"
            style={{ borderColor: 'var(--scout-border)', minHeight: '50px' }}
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setEditingItem(null)}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="text-[10px] px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Save
            </button>
          </div>
        </div>
      )
    }

    return (
      <div
        key={`schedule-${item.type}-${item.id}`}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={() => setDraggedItem(null)}
        className="group p-2 rounded cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: bgColor }}
      >
        {/* Item text with drag handle */}
        <div className="flex items-start gap-1.5">
          <span className="text-[10px] mt-0.5">{typeIcon}</span>
          <p className="flex-1 text-xs leading-snug" style={{ color: 'var(--scout-earth)' }}>
            {item.text}
          </p>
        </div>

        {/* Severity badge if present */}
        {item.severity && (
          <div className="mt-1">
            <span
              className="text-[9px] px-1 py-0.5 rounded capitalize"
              style={{
                backgroundColor: item.severity === 'high' ? 'rgba(169, 68, 66, 0.15)' :
                  item.severity === 'medium' ? 'rgba(210, 105, 30, 0.15)' : 'rgba(93, 122, 93, 0.15)',
                color: item.severity === 'high' ? 'var(--scout-clay)' :
                  item.severity === 'medium' ? 'var(--scout-sunset)' : 'var(--scout-trail)',
              }}
            >
              {item.severity}
            </span>
          </div>
        )}

        {/* Actions - always visible in expanded view */}
        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {/* Unified Assign dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenAssignDropdown(openAssignDropdown === item.id ? null : item.id)}
              className="text-[10px] px-2 py-1 rounded border flex items-center gap-1 hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              Assign
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openAssignDropdown === item.id && (
              <>
                {/* Backdrop to close dropdown on outside click */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenAssignDropdown(null)}
                />
                <div
                  className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border rounded shadow-lg z-20 min-w-[140px]"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                {/* Time window options */}
                <button
                  onClick={() => {
                    handleDateChange(item.id, item.type, getDateForPeriod('day_30'))
                    setOpenAssignDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: 'var(--scout-earth)' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-clay)' }} />
                  30 Days
                </button>
                <button
                  onClick={() => {
                    handleDateChange(item.id, item.type, getDateForPeriod('day_60'))
                    setOpenAssignDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: 'var(--scout-earth)' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-sunset)' }} />
                  60 Days
                </button>
                <button
                  onClick={() => {
                    handleDateChange(item.id, item.type, getDateForPeriod('day_90'))
                    setOpenAssignDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: 'var(--scout-earth)' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-trail)' }} />
                  90 Days
                </button>
                <button
                  onClick={() => {
                    handleDateChange(item.id, item.type, getDateForPeriod('day_90_plus'))
                    setOpenAssignDropdown(null)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: 'var(--scout-earth)' }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--scout-earth-light)' }} />
                  90+ Days
                </button>

                {/* Divider and buckets */}
                {buckets.filter(b => b.status === 'active').length > 0 && (
                  <>
                    <div className="border-t my-1" style={{ borderColor: 'var(--scout-border)' }} />
                    {buckets.filter(b => b.status === 'active').map(bucket => {
                      const isTagged = item.bucketIds?.includes(bucket.bucket_id)
                      return (
                        <button
                          key={bucket.bucket_id}
                          onClick={() => {
                            handleTagToBucket(item, bucket.bucket_id, !!isTagged)
                            setOpenAssignDropdown(null)
                          }}
                          className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 flex items-center gap-2"
                          style={{ color: 'var(--scout-earth)' }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                          />
                          <span className="flex-1 truncate">{bucket.name}</span>
                          {isTagged && <span className="text-green-600 text-[10px]">✓</span>}
                        </button>
                      )
                    })}
                  </>
                )}
                </div>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Edit */}
          <button
            onClick={() => setEditingItem({ id: item.id, type: item.type, text: item.text })}
            className="p-1 rounded hover:bg-white/50"
            title="Edit"
          >
            <svg className="w-3 h-3" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => handleDeleteItem(item)}
            className="p-1 rounded hover:bg-red-100"
            title="Delete"
          >
            <svg className="w-3 h-3" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border p-4 ${isUpdating ? 'opacity-70' : ''}`}
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
          30/60/90 Plan
        </h3>
        <div className="flex items-center gap-2">
          {(activeBucketCount > 0 || completedBucketCount > 0) && (
            <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Buckets:{' '}
              <span style={{ color: 'var(--scout-trail)' }}>{activeBucketCount} active</span>
              {completedBucketCount > 0 && (
                <span style={{ color: 'var(--scout-earth-light)' }}>, {completedBucketCount} completed</span>
              )}
            </span>
          )}
          <button
            onClick={() => setShowPlanningWizard(true)}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1 hover:bg-amber-50 transition-colors"
            style={{ color: 'var(--scout-sunset)' }}
            title="AI-guided planning assistant"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Plan
          </button>
          <button
            onClick={() => setShowBucketModal(true)}
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
            style={{ color: 'var(--scout-sky)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Bucket
          </button>
        </div>
      </div>

      {/* Overdue Section - explicit dates past due */}
      {overdueCount > 0 && (
        <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(169, 68, 66, 0.05)', borderColor: 'var(--scout-clay)' }}>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--scout-clay)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Overdue ({overdueCount})
          </h4>
          <div className="space-y-1">
            {timeBuckets.overdue.map(item => renderItem(item, 'overdue', true))}
          </div>
        </div>
      )}

      {/* Rolled Section - soft dates past due, needs acceptance */}
      {rolledCount > 0 && (
        <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgb(245, 158, 11)' }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium flex items-center gap-1" style={{ color: 'rgb(180, 83, 9)' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {rolledCount} item{rolledCount !== 1 ? 's' : ''} rolled over
            </h4>
            <button
              onClick={handleAcceptAllRolled}
              className="text-[10px] px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 transition-colors"
              style={{ color: 'rgb(180, 83, 9)' }}
            >
              Accept All → +30 days
            </button>
          </div>
          <div className="space-y-1">
            {timeBuckets.rolled.map(item => (
              <div
                key={`rolled-${item.type}-${item.id}`}
                className="flex items-center justify-between p-2 rounded"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 text-xs">{item.type === 'risk' ? '⚠️' : '🔴'}</span>
                  <span className="text-xs truncate" style={{ color: 'rgb(180, 83, 9)' }}>
                    {item.text}
                  </span>
                  {item.targetDate && (
                    <span className="text-[9px] text-amber-600 flex-shrink-0">
                      (from {formatDate(item.targetDate)})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleAcceptRollover(item)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 flex-shrink-0 ml-2"
                  style={{ color: 'rgb(180, 83, 9)' }}
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Period Rows */}
      <div className="space-y-2">
        {(['day_30', 'day_60', 'day_90', 'day_90_plus'] as const).map(period => {
          const periodItems = timeBuckets[period]
          const periodLabel = period === 'day_30' ? '30 Days' : period === 'day_60' ? '60 Days' : period === 'day_90' ? '90 Days' : '90+ Days'
          const isExpanded = expandedPeriod === period
          const isDropping = dropTarget === period
          const count = periodCounts[period]

          return (
            <div
              key={period}
              className={`rounded-lg transition-all ${isDropping ? 'ring-2 ring-offset-1 ring-green-600' : ''}`}
              style={{
                backgroundColor: 'var(--scout-parchment)',
              }}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(period) }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDropOnPeriod(e, period)}
            >
              <button
                onClick={() => setExpandedPeriod(isExpanded ? null : period)}
                className="w-full flex items-center justify-between p-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    style={{ color: 'var(--scout-earth-light)' }}
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-medium" style={{ color: 'var(--scout-earth)' }}>
                    {periodLabel}
                  </span>
                </div>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${count > 0 ? 'font-medium' : ''}`}
                  style={{
                    backgroundColor: count > 0 ? 'rgba(93, 122, 93, 0.15)' : 'transparent',
                    color: count > 0 ? 'var(--scout-trail)' : 'var(--scout-earth-light)',
                  }}
                >
                  {count}
                </span>
              </button>

              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {periodItems.length === 0 && bucketsByPeriod[period].length === 0 ? (
                    <p className="text-xs py-2 text-center" style={{ color: 'var(--scout-earth-light)' }}>
                      No items scheduled
                    </p>
                  ) : (
                    <>
                      {periodItems.map(item => renderItem(item, period))}
                      {/* Buckets with target_date in this period */}
                      {bucketsByPeriod[period].map(bucket => {
                        const items = customBucketItems[bucket.bucket_id] || []
                        const isOverdue = bucket.target_date && new Date(bucket.target_date) < new Date()
                        const isBucketExpanded = expandedBucketInPeriod === bucket.bucket_id
                        return (
                          <div
                            key={`period-bucket-${bucket.bucket_id}`}
                            className="rounded-lg mt-1"
                            style={{
                              backgroundColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}15`,
                              border: `1px solid ${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}30`,
                            }}
                          >
                            {/* Bucket header - clickable to expand/collapse */}
                            <div
                              onClick={() => setExpandedBucketInPeriod(isBucketExpanded ? null : bucket.bucket_id)}
                              className="w-full flex items-center justify-between p-2 hover:bg-white/30 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <svg
                                  className={`w-3 h-3 transition-transform ${isBucketExpanded ? 'rotate-90' : ''}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  style={{ color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                                >
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                                />
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                                >
                                  {bucket.name}
                                </span>
                                <span
                                  className="text-[10px] px-1 py-0.5 rounded"
                                  style={{
                                    backgroundColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}20`,
                                    color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue,
                                  }}
                                >
                                  {items.length}
                                </span>
                                {isOverdue && (
                                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}>
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                {bucket.target_date && (
                                  <span className="text-[10px]" style={{ color: isOverdue ? 'var(--scout-clay)' : 'var(--scout-earth-light)' }}>
                                    {new Date(bucket.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                <button
                                  onClick={() => startEditingBucket(bucket)}
                                  className="p-0.5 rounded hover:bg-white/50"
                                  title="Edit bucket"
                                >
                                  <svg className="w-3 h-3" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* Bucket content - collapsible */}
                            {isBucketExpanded && (
                              <div className="px-2 pb-2">
                                {bucket.description && (
                                  <p className="text-[10px] mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                                    {bucket.description}
                                  </p>
                                )}
                                {items.length > 0 && (
                                  <div className="space-y-0.5 pt-1 border-t" style={{ borderColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}30` }}>
                                    {items.map(item => (
                                      <div key={item.id} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--scout-earth)' }}>
                                        <span>{item.type === 'risk' ? '⚠️' : item.type === 'pain_point' ? '🔴' : '📌'}</span>
                                        <span className="truncate">{item.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Custom Buckets (only undated ones - dated buckets appear in their period) */}
      {undatedBuckets.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--scout-border)' }}>
          <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
            Custom Buckets
          </p>
          {undatedBuckets.map(bucket => {
            const items = customBucketItems[bucket.bucket_id] || []
            const isExpanded = expandedPeriod === `bucket_${bucket.bucket_id}`
            const isDropping = dropTarget === `bucket_${bucket.bucket_id}`

            return (
              <div
                key={bucket.bucket_id}
                className={`rounded-lg transition-all ${isDropping ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                style={{
                  backgroundColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}10`,
                }}
                onDragOver={(e) => { e.preventDefault(); setDropTarget(`bucket_${bucket.bucket_id}`) }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => handleDropOnBucket(e, bucket.bucket_id)}
              >
                <div className="flex items-center justify-between p-2">
                  <button
                    onClick={() => setExpandedPeriod(isExpanded ? null : `bucket_${bucket.bucket_id}`)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      style={{ color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}
                    >
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium truncate" style={{ color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue }}>
                      {bucket.name}
                    </span>
                    {bucket.pursuit_id && (
                      <span className="text-[9px] px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}>
                        Deal
                      </span>
                    )}
                    {bucket.importance && bucket.importance !== 'medium' && (
                      <span
                        className="text-[9px] px-1 py-0.5 rounded capitalize shrink-0"
                        style={{
                          backgroundColor: bucket.importance === 'critical' ? 'rgba(169, 68, 66, 0.15)' :
                            bucket.importance === 'high' ? 'rgba(210, 105, 30, 0.15)' : 'rgba(93, 122, 93, 0.15)',
                          color: bucket.importance === 'critical' ? 'var(--scout-clay)' :
                            bucket.importance === 'high' ? 'var(--scout-sunset)' : 'var(--scout-trail)',
                        }}
                      >
                        {bucket.importance}
                      </span>
                    )}
                    {bucket.target_date && (
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--scout-earth-light)' }}>
                        {new Date(bucket.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue}20`,
                        color: BUCKET_COLORS[bucket.color] || BUCKET_COLORS.blue,
                      }}
                    >
                      {items.length}
                    </span>
                    <button
                      onClick={() => startEditingBucket(bucket)}
                      className="p-0.5 rounded hover:bg-gray-100 opacity-50 hover:opacity-100"
                      title="Edit bucket"
                    >
                      <svg className="w-3 h-3" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBucket(bucket.bucket_id)}
                      className="p-0.5 rounded hover:bg-red-100 opacity-50 hover:opacity-100"
                      title="Delete bucket"
                    >
                      <svg className="w-3 h-3" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-2">
                    {/* Bucket metadata */}
                    {(bucket.description || bucket.instructions || bucket.pursuit_id || (bucket.pursuit_ids && bucket.pursuit_ids.length > 0)) && (
                      <div className="p-2 rounded text-xs space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}>
                        {/* Show linked deals - support both old pursuit_id and new pursuit_ids */}
                        {(() => {
                          const linkedIds = bucket.pursuit_ids && bucket.pursuit_ids.length > 0
                            ? bucket.pursuit_ids
                            : bucket.pursuit_id ? [bucket.pursuit_id] : []
                          if (linkedIds.length === 0) return null
                          const linkedNames = linkedIds.map(id => pursuits.find(p => p.pursuit_id === id)?.name).filter(Boolean)
                          return (
                            <div className="flex items-start gap-1">
                              <span style={{ color: 'var(--scout-earth-light)' }}>Deals:</span>
                              <div className="flex flex-wrap gap-1">
                                {linkedNames.map((name, idx) => (
                                  <span key={idx} className="font-medium px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}>
                                    {name}
                                  </span>
                                ))}
                                {linkedIds.length === pursuits.length && pursuits.length > 0 && (
                                  <span className="text-[10px] px-1 py-0.5" style={{ color: 'var(--scout-trail)' }}>
                                    (All deals)
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                        {bucket.description && (
                          <p style={{ color: 'var(--scout-earth)' }}>{bucket.description}</p>
                        )}
                        {bucket.instructions && (
                          <div className="mt-1 pt-1 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                            <p className="font-medium" style={{ color: 'var(--scout-earth-light)' }}>Instructions:</p>
                            <p className="whitespace-pre-wrap" style={{ color: 'var(--scout-earth)' }}>{bucket.instructions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bucket items */}
                    {items.length === 0 ? (
                      <p className="text-xs py-2 text-center" style={{ color: 'var(--scout-earth-light)' }}>
                        Drag items here to tag them
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {items.map(item => renderItem(item, `bucket_${bucket.bucket_id}`, false))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Undated Items - Collapsible Schedule These Section */}
      {timeBuckets.undated.length > 0 && (() => {
        const undatedRisks = timeBuckets.undated.filter(item => item.type === 'risk')
        const undatedPainPoints = timeBuckets.undated.filter(item => item.type === 'pain_point')

        return (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            {/* Collapsible Header */}
            <button
              onClick={() => setScheduleExpanded(!scheduleExpanded)}
              className="w-full flex items-center justify-between mb-2 group"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-3 h-3 transition-transform ${scheduleExpanded ? 'rotate-90' : ''}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                  Schedule These
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                >
                  {timeBuckets.undated.length}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                {scheduleExpanded ? 'Click to collapse' : 'Click to expand'}
              </span>
            </button>

            {/* Collapsed Preview */}
            {!scheduleExpanded && (
              <div className="flex flex-wrap gap-1">
                {timeBuckets.undated.slice(0, 4).map(item => (
                  <div
                    key={`${item.type}-${item.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={() => setDraggedItem(null)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-grab active:cursor-grabbing"
                    style={{
                      backgroundColor: item.type === 'risk' ? 'rgba(169, 68, 66, 0.1)' : 'rgba(210, 105, 30, 0.1)',
                      color: 'var(--scout-earth)',
                    }}
                    title={item.text}
                  >
                    <span className="text-[10px]">{item.type === 'risk' ? '⚠️' : '🔴'}</span>
                    <span className="max-w-[60px] truncate">{item.text}</span>
                  </div>
                ))}
                {timeBuckets.undated.length > 4 && (
                  <span className="text-[11px] px-2 py-1" style={{ color: 'var(--scout-earth-light)' }}>
                    +{timeBuckets.undated.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Expanded Two-Column View */}
            {scheduleExpanded && (
              <div className="grid grid-cols-2 gap-3">
                {/* Risks Column */}
                <div
                  className="rounded-lg p-2"
                  style={{ backgroundColor: 'rgba(169, 68, 66, 0.05)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs">⚠️</span>
                    <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--scout-clay)' }}>
                      Risks
                    </span>
                    <span
                      className="text-[10px] px-1 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                    >
                      {undatedRisks.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {undatedRisks.length === 0 ? (
                      <p className="text-[10px] text-center py-2" style={{ color: 'var(--scout-earth-light)' }}>
                        No unscheduled risks
                      </p>
                    ) : (
                      undatedRisks.map(item => renderScheduleItem(item))
                    )}
                  </div>
                </div>

                {/* Pain Points Column */}
                <div
                  className="rounded-lg p-2"
                  style={{ backgroundColor: 'rgba(210, 105, 30, 0.05)' }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs">🔴</span>
                    <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--scout-sunset)' }}>
                      Pain Points
                    </span>
                    <span
                      className="text-[10px] px-1 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                    >
                      {undatedPainPoints.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {undatedPainPoints.length === 0 ? (
                      <p className="text-[10px] text-center py-2" style={{ color: 'var(--scout-earth-light)' }}>
                        No unscheduled pain points
                      </p>
                    ) : (
                      undatedPainPoints.map(item => renderScheduleItem(item))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Empty State */}
      {totalDated === 0 && timeBuckets.undated.length === 0 && undatedBuckets.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--scout-earth-light)' }}>
          No milestones or scheduled items yet
        </p>
      )}

      {/* Create Bucket Modal */}
      {showBucketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBucketModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
              Create Bucket
            </h4>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Name *</label>
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="e.g., Demo Prep, Technical Review"
                  className="w-full px-3 py-2 border rounded text-sm"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Description</label>
                <textarea
                  value={newBucketDescription}
                  onChange={(e) => setNewBucketDescription(e.target.value)}
                  placeholder="What needs to be accomplished..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Instructions / Steps</label>
                <textarea
                  value={newBucketInstructions}
                  onChange={(e) => setNewBucketInstructions(e.target.value)}
                  placeholder="Step-by-step instructions to complete this bucket..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
              </div>

              {/* Associated Deals */}
              {pursuits.length > 0 && (
                <MultiDealSelector
                  pursuits={pursuits}
                  selectedIds={newBucketPursuitIds}
                  onChange={setNewBucketPursuitIds}
                  label="Linked Deals (optional)"
                />
              )}

              {/* Due Date & Importance Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Due Date</label>
                  <input
                    type="date"
                    value={newBucketDueDate}
                    onChange={(e) => setNewBucketDueDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Importance</label>
                  <select
                    value={newBucketImportance}
                    onChange={(e) => setNewBucketImportance(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Color</label>
                <div className="flex gap-2">
                  {Object.entries(BUCKET_COLORS).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setNewBucketColor(colorName)}
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: colorValue,
                        outline: newBucketColor === colorName ? `2px solid ${colorValue}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <button
                onClick={() => {
                  setShowBucketModal(false)
                  setNewBucketName('')
                  setNewBucketDescription('')
                  setNewBucketInstructions('')
                  setNewBucketDueDate('')
                  setNewBucketImportance('medium')
                  setNewBucketColor('blue')
                  setNewBucketPursuitIds([])
                }}
                className="px-3 py-1.5 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBucket}
                disabled={!newBucketName.trim()}
                className="px-3 py-1.5 text-sm rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-sky)' }}
              >
                Create Bucket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bucket Modal */}
      {editingBucket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setEditingBucket(null); setEditBucketPursuitIds([]) }}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 w-96 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-3" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
              Edit Bucket
            </h4>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Name *</label>
                <input
                  type="text"
                  value={editingBucket.name}
                  onChange={(e) => setEditingBucket({ ...editingBucket, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Description</label>
                <textarea
                  value={editingBucket.description || ''}
                  onChange={(e) => setEditingBucket({ ...editingBucket, description: e.target.value })}
                  placeholder="What needs to be accomplished..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Instructions / Steps</label>
                <textarea
                  value={editingBucket.instructions || ''}
                  onChange={(e) => setEditingBucket({ ...editingBucket, instructions: e.target.value })}
                  placeholder="Step-by-step instructions to complete this bucket..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded text-sm resize-none"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
              </div>

              {/* Associated Deals */}
              {pursuits.length > 0 && (
                <MultiDealSelector
                  pursuits={pursuits}
                  selectedIds={editBucketPursuitIds}
                  onChange={setEditBucketPursuitIds}
                  label="Linked Deals"
                />
              )}

              {/* Due Date & Importance Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Due Date</label>
                  <input
                    type="date"
                    value={editingBucket.target_date || ''}
                    onChange={(e) => setEditingBucket({ ...editingBucket, target_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Importance</label>
                  <select
                    value={editingBucket.importance || 'medium'}
                    onChange={(e) => setEditingBucket({ ...editingBucket, importance: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>Color</label>
                <div className="flex gap-2">
                  {Object.entries(BUCKET_COLORS).map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => setEditingBucket({ ...editingBucket, color: colorName })}
                      className="w-6 h-6 rounded-full"
                      style={{
                        backgroundColor: colorValue,
                        outline: editingBucket.color === colorName ? `2px solid ${colorValue}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <button
                onClick={() => { setEditingBucket(null); setEditBucketPursuitIds([]) }}
                className="px-3 py-1.5 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBucket}
                disabled={!editingBucket.name.trim()}
                className="px-3 py-1.5 text-sm rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Planning Wizard */}
      {showPlanningWizard && (
        <PlanningWizard
          accountPlanId={accountPlanId}
          accountName={accountName}
          pursuits={pursuits}
          existingContext={{
            painPoints: painPoints.filter(p => p.status !== 'addressed').map(p => p.description),
            risks: risks.filter(r => r.status === 'open').map(r => r.description),
            opportunities: pursuits.map(p => `${p.name}${p.estimated_value ? ` ($${(p.estimated_value / 1000).toFixed(0)}K)` : ''}`),
            bantGaps: bantGaps,
            accountThesis: accountIntelligence.accountThesis,
            compellingEvents: accountIntelligence.compellingEvents,
            buyingSignals: accountIntelligence.buyingSignals,
            researchFindings: accountIntelligence.researchFindings,
            campaignName: accountIntelligence.campaignName,
            campaignContext: accountIntelligence.campaignContext,
            vertical: accountIntelligence.vertical,
          }}
          onClose={() => setShowPlanningWizard(false)}
          onComplete={() => setShowPlanningWizard(false)}
        />
      )}
    </div>
  )
}
