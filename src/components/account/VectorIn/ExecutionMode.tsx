'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DataAnnotation } from '@/components/prototype/DataAnnotation'
import {
  SignalBucket,
  TrackerSection,
  SignalItem,
  Initiative as TrackerInitiative,
  actionItemToSignalItem,
  fieldRequestToSignalItem,
  hazardToSignalItem,
  distressSignalToSignalItem,
  bucketToInitiative,
} from '@/components/tracker'

interface Pattern {
  pattern_id: string
  title: string
  pattern_type: string
  severity: string
  related_issues: string[]
  description: string
}

interface Issue {
  issue_id: string
  external_id: string
  source: string
  title: string
  priority: string
  status: string
  created_days_ago: number
  reporter: string
  pattern_id: string | null
}

interface IssueSignal {
  signal_id: string
  title: string
  type: string
  severity: string
  source_url?: string
}

interface Contact {
  stakeholder_id: string
  name: string
  title: string
  type: string
}

interface ResolutionItem {
  action_id: string
  title: string
  due_date: string
  status: string
  priority: string
  timeframe: string
  description?: string
  bucket?: string
  context?: string
  initiative_id?: string
}

interface Initiative {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived'
  items_count: number
}

interface FieldRequest {
  id: string
  title: string
  description?: string
  priority?: string
  status?: string
  created_at?: string
}

interface Hazard {
  id: string
  title: string
  description?: string
  severity?: string
  status?: string
  created_at?: string
}

interface VectorInExecutionModeProps {
  patterns: Pattern[]
  issues: Issue[]
  issueSignals: IssueSignal[]
  contacts: Contact[]
  resolutionItems: ResolutionItem[]
  accountPlanId: string
  initiatives?: Initiative[]
  fieldRequests?: FieldRequest[]
  hazards?: Hazard[]
  onDataRefresh?: () => void
}

export function VectorInExecutionMode({
  patterns,
  issues,
  issueSignals,
  contacts,
  resolutionItems,
  accountPlanId,
  initiatives = [],
  fieldRequests = [],
  hazards = [],
  onDataRefresh,
}: VectorInExecutionModeProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedTimeframes, setExpandedTimeframes] = useState<Record<string, boolean>>({
    this_week: true,
    next_week: false,
    this_month: false,
    backlog: false,
  })
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<{ id: string; title: string; description?: string } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [dateAssignModal, setDateAssignModal] = useState<{ actionId: string; targetBucket: string } | null>(null)
  const [assignDate, setAssignDate] = useState<string>('')
  const [queueExpanded, setQueueExpanded] = useState(true)

  // Add Action state
  const [isAddingAction, setIsAddingAction] = useState(false)
  const [newAction, setNewAction] = useState({ title: '', bucket: '30' as '30' | '60' | '90', priority: 'P2' })
  const [savingAction, setSavingAction] = useState(false)

  // Issue/Signal detail modal state
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<IssueSignal | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null)

  // Initiative state
  const [isAddingInitiative, setIsAddingInitiative] = useState(false)
  const [newInitiative, setNewInitiative] = useState({ name: '', description: '' })
  const [savingInitiative, setSavingInitiative] = useState(false)
  const [allocatingItemId, setAllocatingItemId] = useState<string | null>(null)

  // Unified tracker state
  const [fetchedInitiatives, setFetchedInitiatives] = useState<TrackerInitiative[]>([])
  const [showClosedItems, setShowClosedItems] = useState(false)

  // Fetch initiatives from buckets API
  useEffect(() => {
    const fetchInitiatives = async () => {
      try {
        const response = await fetch(`/api/accounts/${accountPlanId}/buckets`)
        if (response.ok) {
          const data = await response.json()
          const converted = (data.buckets || []).map((b: {
            bucket_id: string
            name: string
            description?: string
            color?: string
            target_date?: string
            status?: string
          }) => bucketToInitiative({
            bucket_id: b.bucket_id,
            name: b.name,
            description: b.description,
            color: b.color,
            target_date: b.target_date,
            status: b.status,
            items_count: 0,
          }))
          setFetchedInitiatives(converted)
        }
      } catch (error) {
        console.error('Failed to fetch initiatives:', error)
      }
    }
    fetchInitiatives()
  }, [accountPlanId])

  // Convert data to SignalItem format for unified components
  const actionSignals: SignalItem[] = resolutionItems.map(a => actionItemToSignalItem({
    action_id: a.action_id,
    title: a.title,
    priority: a.priority,
    status: a.status,
    due_date: a.due_date,
    bucket: a.bucket,
    initiative_id: a.initiative_id,
  }))

  // Convert Field Requests to SignalItem format
  const fieldRequestSignals: SignalItem[] = fieldRequests.map(fr => fieldRequestToSignalItem({
    id: fr.id,
    title: fr.title,
    description: fr.description,
    priority: fr.priority,
    status: fr.status,
    created_at: fr.created_at,
  }))

  // Convert Hazards to SignalItem format
  const hazardSignals: SignalItem[] = hazards.map(h => hazardToSignalItem({
    id: h.id,
    title: h.title,
    description: h.description,
    severity: h.severity,
    status: h.status,
    created_at: h.created_at,
  }))
  const distressSignals: SignalItem[] = issueSignals.map(s => distressSignalToSignalItem({
    signal_id: s.signal_id,
    title: s.title,
    type: s.type,
    severity: s.severity,
    source_url: s.source_url,
  }))

  const handleUnifiedRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
    onDataRefresh?.()
  }

  const toggleTimeframe = (timeframe: string) => {
    setExpandedTimeframes((prev) => ({ ...prev, [timeframe]: !prev[timeframe] }))
  }

  // Handle item completion toggle
  const handleItemComplete = async (actionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'

    try {
      const response = await fetch(`/api/action-items/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  // Handle drag start
  const handleDragStart = (actionId: string) => {
    setDraggedItem(actionId)
  }

  // Handle drop to new timeframe - show date assignment modal
  const handleDrop = async (newTimeframe: string, skipDateModal?: boolean) => {
    if (!draggedItem) return

    // Map timeframe to bucket value
    const bucketMap: Record<string, string> = {
      this_week: '30',
      next_week: '60',
      this_month: '90',
      backlog: '',
      queue: '',
    }

    // If dropping to a bucket (not queue/backlog), offer date assignment
    if (!skipDateModal && newTimeframe !== 'queue' && newTimeframe !== 'backlog') {
      setDateAssignModal({ actionId: draggedItem, targetBucket: newTimeframe })
      // Pre-calculate default date for the bucket
      const now = new Date()
      if (newTimeframe === 'this_week') {
        now.setDate(now.getDate() + 7)
      } else if (newTimeframe === 'next_week') {
        now.setDate(now.getDate() + 14)
      } else if (newTimeframe === 'this_month') {
        now.setDate(now.getDate() + 30)
      }
      setAssignDate(now.toISOString().split('T')[0])
      setDraggedItem(null)
      return
    }

    try {
      const response = await fetch(`/api/action-items/${draggedItem}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: bucketMap[newTimeframe] || '' }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Failed to move item:', error)
    } finally {
      setDraggedItem(null)
    }
  }

  // Confirm date assignment and move to bucket
  const handleConfirmDateAssign = async (withDate: boolean) => {
    if (!dateAssignModal) return
    setIsUpdating(true)

    const bucketMap: Record<string, string> = {
      this_week: '30',
      next_week: '60',
      this_month: '90',
    }

    try {
      const updateData: Record<string, unknown> = {
        bucket: bucketMap[dateAssignModal.targetBucket] || ''
      }

      if (withDate && assignDate) {
        updateData.due_date = assignDate
      }

      const response = await fetch(`/api/action-items/${dateAssignModal.actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Failed to assign item:', error)
    } finally {
      setIsUpdating(false)
      setDateAssignModal(null)
      setAssignDate('')
    }
  }

  // Handle delete item
  const handleDeleteItem = async (actionId: string) => {
    if (!confirm('Delete this item?')) return
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/action-items/${actionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingItem) return
    setIsUpdating(true)
    try {
      const updateData: Record<string, string> = { title: editingItem.title }
      if (editingItem.description !== undefined) {
        updateData.description = editingItem.description
      }
      const response = await fetch(`/api/action-items/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Failed to save edit:', error)
    } finally {
      setIsUpdating(false)
      setEditingItem(null)
    }
  }

  // Add new action item
  const handleAddAction = async () => {
    if (!newAction.title.trim()) return
    setSavingAction(true)
    try {
      const daysOut = parseInt(newAction.bucket)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + daysOut)

      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: newAction.title.trim(),
          bucket: newAction.bucket,
          priority: newAction.priority,
          due_date: dueDate.toISOString(),
          status: 'pending',
        }),
      })
      if (response.ok) {
        setNewAction({ title: '', bucket: '30', priority: 'P2' })
        setIsAddingAction(false)
        startTransition(() => {
          router.refresh()
        })
        onDataRefresh?.()
      }
    } catch (error) {
      console.error('Failed to add action:', error)
    } finally {
      setSavingAction(false)
    }
  }

  // Create action item from signal
  const handleCreateActionFromSignal = async (signal: IssueSignal) => {
    try {
      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: `Follow up: ${signal.title}`,
          description: `Created from distress signal: ${signal.title}`,
          bucket: '30',
          priority: signal.severity === 'high' ? 'P1' : 'P2',
          status: 'pending',
        }),
      })
      if (response.ok) {
        setSelectedSignal(null)
        startTransition(() => {
          router.refresh()
        })
        onDataRefresh?.()
      }
    } catch (error) {
      console.error('Failed to create action from signal:', error)
    }
  }

  // Add initiative
  const handleAddInitiative = async () => {
    if (!newInitiative.name.trim()) return
    setSavingInitiative(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/buckets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newInitiative.name.trim(),
          description: newInitiative.description.trim() || null,
          color: 'blue',
        }),
      })
      if (response.ok) {
        setNewInitiative({ name: '', description: '' })
        setIsAddingInitiative(false)
        startTransition(() => {
          router.refresh()
        })
        onDataRefresh?.()
      }
    } catch (error) {
      console.error('Failed to add initiative:', error)
    } finally {
      setSavingInitiative(false)
    }
  }

  // Allocate item to initiative
  const handleAllocateToInitiative = async (actionId: string, initiativeId: string) => {
    try {
      const response = await fetch(`/api/action-items/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiative_id: initiativeId }),
      })
      if (response.ok) {
        setAllocatingItemId(null)
        startTransition(() => {
          router.refresh()
        })
        onDataRefresh?.()
      }
    } catch (error) {
      console.error('Failed to allocate item:', error)
    }
  }

  // Queue items: no bucket assigned
  const queue = resolutionItems.filter((r) => !r.bucket && r.timeframe !== 'backlog')
  // Bucketed items
  const thisWeek = resolutionItems.filter((r) => r.timeframe === 'this_week' && r.bucket === '30')
  const nextWeek = resolutionItems.filter((r) => r.timeframe === 'next_week' && r.bucket === '60')
  const thisMonth = resolutionItems.filter((r) => r.timeframe === 'this_month' && r.bucket === '90')
  const backlog = resolutionItems.filter((r) => r.timeframe === 'backlog' || (!r.bucket && !r.due_date))

  // Color coding for buckets
  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case '30':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', label: 'This Week' }
      case '60':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', label: 'Next Week' }
      case '90':
        return { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', label: 'This Month' }
      default:
        return { bg: 'var(--scout-parchment)', border: 'var(--scout-border)', label: 'Queue' }
    }
  }

  const p1Issues = issues.filter((i) => i.priority === 'P1')
  const p2Issues = issues.filter((i) => i.priority === 'P2')
  const p3Issues = issues.filter((i) => i.priority === 'P3')

  const admins = contacts.filter((c) => c.type === 'admin')
  const users = contacts.filter((c) => c.type === 'user')

  const getPatternSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return { icon: '🔴', color: 'var(--scout-clay)' }
      case 'medium':
        return { icon: '🟡', color: 'var(--scout-sunset)' }
      case 'low':
        return { icon: '🟢', color: 'var(--scout-trail)' }
      default:
        return { icon: '⚪', color: 'var(--scout-earth-light)' }
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { icon: '🔴', color: 'var(--scout-clay)' }
      case 'P2':
        return { icon: '🟡', color: 'var(--scout-sunset)' }
      case 'P3':
        return { icon: '🟢', color: 'var(--scout-trail)' }
      default:
        return { icon: '⚪', color: 'var(--scout-earth-light)' }
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Resolution Tracker */}
        <div className="col-span-2 space-y-6">
          {/* Rescue Ops - Unified TrackerSection */}
          <TrackerSection
            title="Rescue Ops"
            items={actionSignals}
            initiatives={fetchedInitiatives}
            accountPlanId={accountPlanId}
            showClosed={showClosedItems}
            onRefresh={handleUnifiedRefresh}
            itemType="action_item"
          />

          {/* Date Assignment Modal */}
          {dateAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div
                className="bg-white rounded-xl p-6 shadow-xl max-w-sm w-full mx-4"
                style={{ backgroundColor: 'var(--scout-white)' }}
              >
                <h3 className="font-semibold mb-4" style={{ color: 'var(--scout-saddle)' }}>
                  Assign to {getBucketColor(
                    dateAssignModal.targetBucket === 'this_week' ? '30' :
                    dateAssignModal.targetBucket === 'next_week' ? '60' : '90'
                  ).label}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
                  Would you like to set a specific due date?
                </p>
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--scout-earth)' }}>
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmDateAssign(true)}
                    disabled={isUpdating}
                    className="flex-1 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-trail)' }}
                  >
                    {isUpdating ? 'Saving...' : 'Set Date & Assign'}
                  </button>
                  <button
                    onClick={() => handleConfirmDateAssign(false)}
                    disabled={isUpdating}
                    className="flex-1 py-2 text-sm rounded-lg border font-medium disabled:opacity-50"
                    style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                  >
                    No Date
                  </button>
                </div>
                <button
                  onClick={() => setDateAssignModal(null)}
                  className="w-full mt-2 py-2 text-sm text-center"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Urgent Focus */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Urgent Focus
              </h3>
              <DataAnnotation note="P1 tickets + escalations" />
            </div>

            <div className="space-y-2">
              {p1Issues.slice(0, 2).map((issue) => (
                <div
                  key={issue.issue_id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(169, 68, 66, 0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <span>🔴</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                      {issue.title}
                    </span>
                  </div>
                  <p className="text-xs mt-1 ml-6" style={{ color: 'var(--scout-earth-light)' }}>
                    {issue.created_days_ago} days open
                  </p>
                  <DataAnnotation note="Escalation risk: High" inline />
                </div>
              ))}
            </div>
          </div>

          {/* Customer Needs and Platform Issues Row - Unified SignalBuckets */}
          <div className="grid grid-cols-2 gap-4">
            <SignalBucket
              title="Field Requests"
              icon="📋"
              items={fieldRequestSignals}
              itemType="field_request"
              initiatives={fetchedInitiatives}
              accountPlanId={accountPlanId}
              showClosed={showClosedItems}
              onRefresh={handleUnifiedRefresh}
              emptyMessage="No field requests yet"
              annotation="Requests, feature asks - expansion opportunities"
            />
            <SignalBucket
              title="Hazards"
              icon="🚧"
              items={hazardSignals}
              itemType="hazard"
              initiatives={fetchedInitiatives}
              accountPlanId={accountPlanId}
              showClosed={showClosedItems}
              onRefresh={handleUnifiedRefresh}
              emptyMessage="No hazards identified"
              annotation="Bugs, broken functionality - technical dangers"
            />
          </div>
        </div>

        {/* Right Column - Threat Watch */}
        <div className="space-y-6">
          {/* Threat Watch (Issue Overview) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <h3
              className="font-semibold mb-4"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Threat Watch
            </h3>

            {/* Patterns Section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                  Threats
                </span>
                <DataAnnotation source="patterns table" purpose="Recurring dangers to address" />
              </div>

              {patterns.map((pattern) => {
                const style = getPatternSeverityStyle(pattern.severity)
                return (
                  <div
                    key={pattern.pattern_id}
                    onClick={() => setSelectedPattern(pattern)}
                    className="p-3 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-gray-50 hover:ring-1 hover:ring-gray-200"
                    style={{ backgroundColor: 'var(--scout-parchment)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span>{style.icon}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                          {pattern.title}
                        </span>
                      </div>
                      <span className="text-xs capitalize" style={{ color: style.color }}>
                        {pattern.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-1 ml-6" style={{ color: 'var(--scout-earth-light)' }}>
                      {pattern.related_issues.length} tickets · {pattern.pattern_type}
                    </p>
                    <DataAnnotation note={`pattern_type: '${pattern.pattern_type}'`} inline />
                  </div>
                )
              })}

              <button
                className="w-full py-2 text-sm rounded-lg border mt-2"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
              >
                🤖 Analyze Patterns
              </button>
            </div>

            {/* Tickets Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--scout-earth-light)' }}>
                  Tickets
                </span>
                <DataAnnotation source="account_issues table" />
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span style={{ color: 'var(--scout-clay)' }}>P1: {p1Issues.length}</span>
                  <span>│</span>
                  <span style={{ color: 'var(--scout-sunset)' }}>P2: {p2Issues.length}</span>
                  <span>│</span>
                  <span style={{ color: 'var(--scout-earth-light)' }}>P3: {p3Issues.length}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Oldest: {Math.max(...issues.map((i) => i.created_days_ago))} days
                </p>
              </div>

              <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
                View all →
              </button>
            </div>
          </div>

          {/* Distress Signals */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Distress Signals
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="Derived from issue analysis" />
                <button className="text-sm">🔄</button>
              </div>
            </div>

            <div className="space-y-2">
              {issueSignals.map((signal) => (
                <div
                  key={signal.signal_id}
                  onClick={() => setSelectedSignal(signal)}
                  className="p-2 rounded text-xs cursor-pointer transition-colors hover:bg-gray-50 group"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {signal.type === 'risk' && '⚠️'}
                      {signal.type === 'sentiment' && '📉'}
                      {signal.type === 'pattern' && '🔄'}
                    </span>
                    <span className="flex-1" style={{ color: 'var(--scout-saddle)' }}>{signal.title}</span>
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
                    >
                      View
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
              View all →
            </button>
          </div>

          {/* Compass (Contacts) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Compass ({contacts.length})
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="stakeholders table" note="Filter: technical contacts, admins" />
                <button className="text-sm">🤖</button>
              </div>
            </div>

            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Admins: {admins.length} │ Users: {users.length}
            </p>

            <button className="mt-3 text-xs" style={{ color: 'var(--scout-sky)' }}>
              View all →
            </button>
          </div>
        </div>
      </div>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--scout-white)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                Distress Signal
              </h3>
              <button
                onClick={() => setSelectedSignal(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {selectedSignal.type === 'risk' && '⚠️'}
                  {selectedSignal.type === 'sentiment' && '📉'}
                  {selectedSignal.type === 'pattern' && '🔄'}
                </span>
                <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                  {selectedSignal.title}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span
                  className="px-2 py-0.5 rounded text-xs capitalize"
                  style={{
                    backgroundColor: selectedSignal.severity === 'high' ? 'rgba(169, 68, 66, 0.1)' : 'rgba(210, 105, 30, 0.1)',
                    color: selectedSignal.severity === 'high' ? 'var(--scout-clay)' : 'var(--scout-sunset)',
                  }}
                >
                  {selectedSignal.severity} severity
                </span>
                <span
                  className="px-2 py-0.5 rounded text-xs capitalize"
                  style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                >
                  {selectedSignal.type}
                </span>
              </div>

              {selectedSignal.source_url && (
                <a
                  href={selectedSignal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  🔗 View source
                </a>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => handleCreateActionFromSignal(selectedSignal)}
                className="flex-1 py-2 text-sm rounded-lg text-white font-medium"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Create Action Item
              </button>
              <button
                onClick={() => setSelectedSignal(null)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="bg-white rounded-xl p-6 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--scout-white)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                Threat Pattern
              </h3>
              <button
                onClick={() => setSelectedPattern(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-lg" style={{ color: 'var(--scout-saddle)' }}>
                  {selectedPattern.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs capitalize"
                    style={{
                      backgroundColor: selectedPattern.severity === 'high' ? 'rgba(169, 68, 66, 0.1)' : 'rgba(210, 105, 30, 0.1)',
                      color: selectedPattern.severity === 'high' ? 'var(--scout-clay)' : 'var(--scout-sunset)',
                    }}
                  >
                    {selectedPattern.severity}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                  >
                    {selectedPattern.pattern_type}
                  </span>
                </div>
              </div>

              {selectedPattern.description && (
                <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {selectedPattern.description}
                </p>
              )}

              <div>
                <h5 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-saddle)' }}>
                  Related Issues ({selectedPattern.related_issues.length})
                </h5>
                <div className="space-y-2">
                  {selectedPattern.related_issues.map((issueId, idx) => {
                    const issue = issues.find(i => i.issue_id === issueId)
                    return (
                      <div
                        key={issueId}
                        className="p-2 rounded text-sm flex items-center gap-2"
                        style={{ backgroundColor: 'var(--scout-parchment)' }}
                      >
                        <span>
                          {issue?.priority === 'P1' ? '🔴' : issue?.priority === 'P2' ? '🟡' : '🟢'}
                        </span>
                        <span style={{ color: 'var(--scout-saddle)' }}>
                          {issue?.title || `Issue ${idx + 1}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setSelectedPattern(null)}
                className="flex-1 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimeframeSection({
  label,
  count,
  expanded,
  onToggle,
  items,
  note,
  timeframeKey,
  bucketColor,
  onItemComplete,
  onDragStart,
  onDrop,
  onEdit,
  onDelete,
  editingItem,
  setEditingItem,
  onSaveEdit,
  isPending,
}: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
  items: ResolutionItem[]
  note?: string
  timeframeKey: string
  bucketColor?: { bg: string; border: string; label: string }
  onItemComplete: (actionId: string, currentStatus: string) => void
  onDragStart: (actionId: string) => void
  onDrop: (timeframe: string) => void
  onEdit: (actionId: string, title: string, description?: string) => void
  onDelete: (actionId: string) => void
  editingItem: { id: string; title: string; description?: string } | null
  setEditingItem: (item: { id: string; title: string; description?: string } | null) => void
  onSaveEdit: () => void
  isPending?: boolean
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'P1':
        return '🔴'
      case 'P2':
        return '🟡'
      default:
        return '🟢'
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(timeframeKey)
  }

  return (
    <div
      className={`mb-2 ${isDragOver ? 'ring-2 ring-blue-400 rounded' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
          <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
            {label}
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
        >
          {count}
        </span>
      </button>

      {expanded && items.length > 0 && (
        <div className={`ml-6 mt-2 space-y-2 ${isPending ? 'opacity-50' : ''}`}>
          {note && <DataAnnotation note={note} inline />}
          {items.map((item) => (
            <div
              key={item.action_id}
              draggable={editingItem?.id !== item.action_id}
              onDragStart={() => onDragStart(item.action_id)}
              className="flex flex-col p-2 rounded cursor-grab active:cursor-grabbing group hover:ring-1 hover:ring-gray-200"
              style={{
                backgroundColor: bucketColor?.bg || 'var(--scout-parchment)',
                borderLeft: bucketColor ? `3px solid ${bucketColor.border}` : undefined
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    onChange={() => onItemComplete(item.action_id, item.status)}
                    className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                    style={{ accentColor: 'var(--scout-trail)' }}
                  />
                  <span className="flex-shrink-0">{getPriorityIcon(item.priority)}</span>
                  {editingItem?.id === item.action_id ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editingItem.title}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) onSaveEdit()
                          if (e.key === 'Escape') setEditingItem(null)
                        }}
                        className="w-full text-sm px-2 py-1 border rounded"
                        style={{ borderColor: 'var(--scout-border)' }}
                        autoFocus
                        placeholder="Title"
                      />
                      <textarea
                        value={editingItem.description || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                        className="w-full text-xs px-2 py-1 border rounded resize-none"
                        style={{ borderColor: 'var(--scout-border)' }}
                        rows={2}
                        placeholder="Context or instructions (optional)"
                      />
                    </div>
                  ) : (
                    <span
                      className={`text-sm truncate ${item.status === 'completed' ? 'line-through' : ''}`}
                      style={{ color: item.status === 'completed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)' }}
                      onDoubleClick={() => onEdit(item.action_id, item.title, item.description)}
                    >
                      {item.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingItem?.id === item.action_id ? (
                    <>
                      <button
                        onClick={onSaveEdit}
                        className="p-1 rounded hover:bg-green-100 text-green-600 text-xs"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 text-xs"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      {item.due_date && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--scout-earth)' }}>
                          {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span className="text-xs mr-1" style={{ color: 'var(--scout-earth-light)' }}>
                        {item.priority}
                      </span>
                      <button
                        onClick={() => onEdit(item.action_id, item.title, item.description)}
                        className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(item.action_id)}
                        className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Show description/context if present and not editing */}
              {!editingItem && item.description && (
                <p className="text-xs mt-1 ml-10 truncate" style={{ color: 'var(--scout-earth-light)' }}>
                  {item.description}
                </p>
              )}
            </div>
          ))}
          {items.length > 0 && (
            <DataAnnotation source="action_items" inline />
          )}
        </div>
      )}
    </div>
  )
}
