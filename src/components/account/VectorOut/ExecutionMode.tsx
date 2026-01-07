'use client'

import { useState } from 'react'
import { DataAnnotation } from '@/components/prototype/DataAnnotation'
import { TrailDrawer } from '@/components/drawers/TrailDrawer'

interface Spark {
  spark_id: string
  title: string
  description: string
  why_it_matters?: string
  size: 'high' | 'medium' | 'low'
  signals_connected: string[]
  questions_to_explore: string[]
  status: string
  linked_pursuit_id: string | null
  converted_to_pursuit_id: string | null
}

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  estimated_value: number
  target_close_date: string | null
  deal_type: string | null
  crm_url?: string | null  // HubSpot deal URL or other CRM link
}

interface ActionItem {
  action_id: string
  title: string
  due_date: string
  status: string
  priority: string
  bucket: '30' | '60' | '90'
  owner?: string
  pursuit_id?: string
}

interface PainPoint {
  pain_point_id: string
  title: string
  severity: string
}

interface Risk {
  risk_id: string
  title: string
  severity: string
  status: string
}

interface Signal {
  signal_id: string
  title: string
  type: string
  date: string
  summary?: string
  source?: string
}

interface Stakeholder {
  stakeholder_id: string
  name: string
  title: string
  influence_level: string
  email?: string
  phone?: string
  linkedin_url?: string
  division_id?: string
  sentiment?: string
}

interface Division {
  division_id: string
  name: string
  description?: string
  headcount?: number
  parent_division_id?: string
}

interface VectorOutExecutionModeProps {
  accountPlanId?: string
  sparks: Spark[]
  pursuits: Pursuit[]
  actionItems: ActionItem[]
  painPoints: PainPoint[]
  risks: Risk[]
  signals: Signal[]
  stakeholders: Stakeholder[]
  divisions: Division[]
  onSparkLink?: (sparkId: string, pursuitId: string | null) => void
  onExploreSparks?: () => void
  onAddDeal?: () => void
  onActionUpdate?: () => void  // Callback after any data changes
  onDataRefresh?: () => void   // Full data refresh callback
}

export function VectorOutExecutionMode({
  accountPlanId,
  sparks,
  pursuits,
  actionItems,
  painPoints,
  risks,
  signals,
  stakeholders,
  divisions,
  onSparkLink,
  onExploreSparks,
  onAddDeal,
  onActionUpdate,
  onDataRefresh,
}: VectorOutExecutionModeProps) {
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({
    '30': true,
    '60': false,
    '90': false,
    '90+': false,
  })
  const [linkingSparkId, setLinkingSparkId] = useState<string | null>(null)

  // Action item editing state
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null)
  const [isAddingAction, setIsAddingAction] = useState(false)
  const [newActionTitle, setNewActionTitle] = useState('')
  const [newActionBucket, setNewActionBucket] = useState<'30' | '60' | '90'>('30')
  const [newActionOwner, setNewActionOwner] = useState('')
  const [savingAction, setSavingAction] = useState(false)

  // Trail drawer state
  const [selectedTrail, setSelectedTrail] = useState<Spark | null>(null)
  const [isTrailDrawerOpen, setIsTrailDrawerOpen] = useState(false)
  const [isCreatingTrail, setIsCreatingTrail] = useState(false)

  // Signal editing state
  const [editingSignal, setEditingSignal] = useState<Signal | null>(null)
  const [isAddingSignal, setIsAddingSignal] = useState(false)
  const [newSignal, setNewSignal] = useState({ title: '', type: 'buying_signal', source: '' })
  const [savingSignal, setSavingSignal] = useState(false)

  // Stakeholder editing state
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [isAddingStakeholder, setIsAddingStakeholder] = useState(false)
  const [newStakeholder, setNewStakeholder] = useState({ name: '', title: '', influence_level: 'medium' })
  const [savingStakeholder, setSavingStakeholder] = useState(false)

  // Division editing state
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  const [isAddingDivision, setIsAddingDivision] = useState(false)
  const [newDivision, setNewDivision] = useState({ name: '', description: '' })
  const [savingDivision, setSavingDivision] = useState(false)

  // Get linked pursuit for a spark
  const getLinkedPursuit = (spark: Spark): Pursuit | undefined => {
    const linkedId = spark.linked_pursuit_id || spark.converted_to_pursuit_id
    return linkedId ? pursuits.find(p => p.pursuit_id === linkedId) : undefined
  }

  // Get spark linked to a pursuit
  const getLinkedSpark = (pursuitId: string): Spark | undefined => {
    return sparks.find(s => s.linked_pursuit_id === pursuitId || s.converted_to_pursuit_id === pursuitId)
  }

  // Handle linking a spark to a pursuit
  const handleLinkSpark = async (sparkId: string, pursuitId: string | null) => {
    if (onSparkLink) {
      onSparkLink(sparkId, pursuitId)
    } else {
      // Direct API call if no callback provided
      try {
        await fetch(`/api/sparks/${sparkId}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pursuitId,
            action: pursuitId ? 'link' : 'unlink',
          }),
        })
        // Reload the page to refresh data
        window.location.reload()
      } catch (error) {
        console.error('Failed to link spark:', error)
      }
    }
    setLinkingSparkId(null)
  }

  const toggleBucket = (bucket: string) => {
    setExpandedBuckets((prev) => ({ ...prev, [bucket]: !prev[bucket] }))
  }

  // Add new action item
  const handleAddAction = async () => {
    if (!newActionTitle.trim() || !accountPlanId) return
    setSavingAction(true)
    try {
      const daysOut = parseInt(newActionBucket)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + daysOut)

      const response = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: newActionTitle.trim(),
          owner: newActionOwner.trim() || null,
          bucket: newActionBucket,
          due_date: dueDate.toISOString(),
          status: 'pending',
          priority: 'Medium',
        }),
      })
      if (response.ok) {
        setNewActionTitle('')
        setNewActionOwner('')
        setIsAddingAction(false)
        onActionUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add action:', error)
    } finally {
      setSavingAction(false)
    }
  }

  // Update action item
  const handleUpdateAction = async (action: ActionItem) => {
    if (!accountPlanId) return
    setSavingAction(true)
    try {
      const response = await fetch(`/api/action-items/${action.action_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: action.title,
          status: action.status,
          bucket: action.bucket,
          due_date: action.due_date,
          priority: action.priority,
        }),
      })
      if (response.ok) {
        setEditingAction(null)
        onActionUpdate?.()
      }
    } catch (error) {
      console.error('Failed to update action:', error)
    } finally {
      setSavingAction(false)
    }
  }

  // Delete action item
  const handleDeleteAction = async (actionId: string) => {
    if (!confirm('Delete this action item?')) return
    try {
      await fetch(`/api/action-items/${actionId}`, { method: 'DELETE' })
      onActionUpdate?.()
    } catch (error) {
      console.error('Failed to delete action:', error)
    }
  }

  // Toggle action status
  const handleToggleStatus = async (action: ActionItem) => {
    const newStatus = action.status === 'completed' ? 'pending' : 'completed'
    try {
      await fetch(`/api/action-items/${action.action_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onActionUpdate?.()
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }

  // Trail handlers
  const handleOpenTrail = (trail: Spark) => {
    setSelectedTrail(trail)
    setIsCreatingTrail(false)
    setIsTrailDrawerOpen(true)
  }

  const handleCreateTrail = () => {
    setSelectedTrail(null)
    setIsCreatingTrail(true)
    setIsTrailDrawerOpen(true)
  }

  const handleTrailSave = () => {
    setIsTrailDrawerOpen(false)
    setSelectedTrail(null)
    onActionUpdate?.()
  }

  const handleTrailDelete = () => {
    setIsTrailDrawerOpen(false)
    setSelectedTrail(null)
    onActionUpdate?.()
  }

  // Signal handlers
  const handleAddSignal = async () => {
    if (!newSignal.title.trim() || !accountPlanId) return
    setSavingSignal(true)
    try {
      // API expects findings array format
      const response = await fetch(`/api/accounts/${accountPlanId}/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: [{
            signal_type: newSignal.type,
            title: newSignal.title.trim(),
            summary: newSignal.title.trim(), // Use title as summary
            source: newSignal.source.trim() || 'Manual Entry',
            confidence: 'medium',
          }],
        }),
      })
      if (response.ok) {
        setNewSignal({ title: '', type: 'buying_signal', source: '' })
        setIsAddingSignal(false)
        onActionUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add signal:', error)
    } finally {
      setSavingSignal(false)
    }
  }

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Delete this signal?') || !accountPlanId) return
    try {
      await fetch(`/api/accounts/${accountPlanId}/signals/${signalId}`, { method: 'DELETE' })
      onActionUpdate?.()
    } catch (error) {
      console.error('Failed to delete signal:', error)
    }
  }

  // Stakeholder handlers
  const handleAddStakeholder = async () => {
    if (!newStakeholder.name.trim() || !accountPlanId) return
    setSavingStakeholder(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newStakeholder.name.trim(),
          title: newStakeholder.title.trim() || null,
          influence_level: newStakeholder.influence_level,
        }),
      })
      if (response.ok) {
        setNewStakeholder({ name: '', title: '', influence_level: 'medium' })
        setIsAddingStakeholder(false)
        onActionUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add stakeholder:', error)
    } finally {
      setSavingStakeholder(false)
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!confirm('Delete this stakeholder?')) return
    try {
      await fetch(`/api/stakeholders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: stakeholderId }),
      })
      onActionUpdate?.()
    } catch (error) {
      console.error('Failed to delete stakeholder:', error)
    }
  }

  // Division handlers
  const handleAddDivision = async () => {
    if (!newDivision.name.trim() || !accountPlanId) return
    setSavingDivision(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDivision.name.trim(),
          description: newDivision.description.trim() || null,
        }),
      })
      if (response.ok) {
        setNewDivision({ name: '', description: '' })
        setIsAddingDivision(false)
        onActionUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add division:', error)
    } finally {
      setSavingDivision(false)
    }
  }

  const handleDeleteDivision = async (divisionId: string) => {
    if (!confirm('Delete this division?') || !accountPlanId) return
    try {
      await fetch(`/api/accounts/${accountPlanId}/divisions/${divisionId}`, { method: 'DELETE' })
      onActionUpdate?.()
    } catch (error) {
      console.error('Failed to delete division:', error)
    }
  }

  // Signal type helpers
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'regulatory': return '📋'
      case 'buying_signal': return '💼'
      case 'leadership_change': return '👤'
      case 'expansion': return '📈'
      case 'funding': return '💰'
      case 'partnership': return '🤝'
      case 'product_launch': return '🚀'
      case 'news': return '📰'
      case 'org_change': return '🏢'
      case 'competitor': return '⚔️'
      case 'trigger': return '🎯'
      default: return '📡'
    }
  }

  const bucket30 = actionItems.filter((a) => a.bucket === '30')
  const bucket60 = actionItems.filter((a) => a.bucket === '60')
  const bucket90 = actionItems.filter((a) => a.bucket === '90')

  // 2-week focus (next 14 days)
  const twoWeekItems = actionItems.filter((a) => {
    const due = new Date(a.due_date)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff <= 14 && diff >= 0
  })

  const getSizeBadge = (size: string) => {
    switch (size) {
      case 'high':
        return { label: '$$$', color: 'var(--scout-trail)' }
      case 'medium':
        return { label: '$$', color: 'var(--scout-sky)' }
      case 'low':
        return { label: '$', color: 'var(--scout-sunset)' }
      default:
        return { label: '?', color: 'var(--scout-earth-light)' }
    }
  }

  const highInfluence = stakeholders.filter((s) => s.influence_level === 'high').length
  const medInfluence = stakeholders.filter((s) => s.influence_level === 'medium').length

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Tracker */}
        <div className="col-span-2 space-y-6">
          {/* Journey (30/60/90 Plan) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-semibold"
                style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
              >
                Journey
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation
                  source="risks, pain_points, action_items"
                  note="Items with target_date grouped by bucket"
                />
                <button className="text-sm px-3 py-1 rounded border" style={{ borderColor: 'var(--scout-border)' }}>
                  🤖
                </button>
              </div>
            </div>

            {/* Scrollable Bucket Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {/* Bucket: 30 Days */}
              <BucketSection
                label="30 Days"
                count={bucket30.length}
                expanded={expandedBuckets['30']}
                onToggle={() => toggleBucket('30')}
                items={bucket30}
                editingAction={editingAction}
                onEditAction={setEditingAction}
                onUpdateAction={handleUpdateAction}
                onDeleteAction={handleDeleteAction}
                onToggleStatus={handleToggleStatus}
                savingAction={savingAction}
              />

              {/* Bucket: 60 Days */}
              <BucketSection
                label="60 Days"
                count={bucket60.length}
                expanded={expandedBuckets['60']}
                onToggle={() => toggleBucket('60')}
                items={bucket60}
                editingAction={editingAction}
                onEditAction={setEditingAction}
                onUpdateAction={handleUpdateAction}
                onDeleteAction={handleDeleteAction}
                onToggleStatus={handleToggleStatus}
                savingAction={savingAction}
              />

              {/* Bucket: 90 Days */}
              <BucketSection
                label="90 Days"
                count={bucket90.length}
                expanded={expandedBuckets['90']}
                onToggle={() => toggleBucket('90')}
                items={bucket90}
                editingAction={editingAction}
                onEditAction={setEditingAction}
                onUpdateAction={handleUpdateAction}
                onDeleteAction={handleDeleteAction}
                onToggleStatus={handleToggleStatus}
                savingAction={savingAction}
              />
            </div>

            {/* Add Action Form */}
            {isAddingAction ? (
              <div
                className="mt-4 p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <input
                  type="text"
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder="Action item title..."
                  className="w-full px-3 py-2 rounded border text-sm mb-2"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newActionOwner}
                    onChange={(e) => setNewActionOwner(e.target.value)}
                    placeholder="Owner (optional)..."
                    className="flex-1 px-2 py-1 text-sm border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                  <select
                    value={newActionBucket}
                    onChange={(e) => setNewActionBucket(e.target.value as '30' | '60' | '90')}
                    className="px-2 py-1 text-sm border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddAction}
                    disabled={savingAction || !newActionTitle.trim()}
                    className="px-3 py-1 text-sm rounded text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-trail)' }}
                  >
                    {savingAction ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setIsAddingAction(false); setNewActionTitle(''); setNewActionOwner('') }}
                    className="px-3 py-1 text-sm rounded border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs flex items-center gap-2" style={{ color: 'var(--scout-earth-light)' }}>
                📁 Buckets: 2 active
                <DataAnnotation source="buckets table" />
              </p>
            </div>
          </div>

          {/* 2-Week Focus */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                2-Week Focus
              </h3>
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                Jan 5 - Jan 19
              </span>
            </div>
            <DataAnnotation source="action_items" note="Filter: due_date within 14 days" inline />

            <div className="mt-3 space-y-2">
              {twoWeekItems.slice(0, 3).map((item) => (
                <div
                  key={item.action_id}
                  className="flex items-center gap-2 text-sm p-2 rounded"
                  style={{ backgroundColor: 'var(--scout-parchment)' }}
                >
                  <span>●</span>
                  <span className="flex-1" style={{ color: 'var(--scout-saddle)' }}>
                    {item.title}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsAddingAction(true)}
              className="mt-3 text-xs flex items-center gap-1 hover:underline"
              style={{ color: 'var(--scout-sky)' }}
            >
              + Add Action
            </button>
          </div>

          {/* Pain Points and Risks Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Pain Points */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  Pain Points ({painPoints.length})
                </h3>
                <DataAnnotation source="pain_points table" note="Vector Out = sales opportunities" />
              </div>

              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--scout-clay)' }}>
                  Critical: {painPoints.filter((p) => p.severity === 'critical').length}
                </p>
                <p style={{ color: 'var(--scout-sunset)' }}>
                  Significant: {painPoints.filter((p) => p.severity === 'significant').length}
                </p>
                <p style={{ color: 'var(--scout-earth-light)' }}>
                  Moderate: {painPoints.filter((p) => p.severity === 'moderate').length}
                </p>
              </div>

              <button
                className="mt-3 text-xs"
                style={{ color: 'var(--scout-sky)' }}
              >
                View all →
              </button>
            </div>

            {/* Risks */}
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  Open Risks ({risks.filter((r) => r.status === 'open').length})
                </h3>
                <DataAnnotation source="risks table" />
              </div>

              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--scout-clay)' }}>
                  Critical: {risks.filter((r) => r.severity === 'critical').length}
                </p>
                <p style={{ color: 'var(--scout-sunset)' }}>
                  High: {risks.filter((r) => r.severity === 'high').length}
                </p>
              </div>

              <button
                className="mt-3 text-xs"
                style={{ color: 'var(--scout-sky)' }}
              >
                Manage →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Opportunities & Intelligence */}
        <div className="space-y-6">
          {/* Trails (Opportunity Themes) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Trails ({sparks.length})
              </h3>
              <DataAnnotation source="scout_themes table" purpose="Opportunity hypotheses to explore" />
            </div>

            {sparks.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
                No trails blazed yet. Blaze a new trail to explore opportunities.
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-2">
                {sparks.map((spark) => {
                  const badge = getSizeBadge(spark.size)
                  const linkedPursuit = getLinkedPursuit(spark)
                  const isLinking = linkingSparkId === spark.spark_id
                  return (
                    <div
                      key={spark.spark_id}
                      className="p-3 rounded-lg transition-colors cursor-pointer group hover:shadow-sm"
                      style={{
                        backgroundColor: linkedPursuit ? 'rgba(93, 122, 93, 0.08)' : 'var(--scout-parchment)',
                        border: linkedPursuit ? '1px solid var(--scout-trail)' : '1px solid transparent',
                      }}
                      onClick={() => handleOpenTrail(spark)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span>💡</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                            {spark.title}
                          </span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: badge.color }}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs mt-1 ml-6" style={{ color: 'var(--scout-earth-light)' }}>
                        {spark.signals_connected.length} signals · {spark.questions_to_explore.length} Qs
                      </div>
                      {/* CRM Link Row */}
                      <div className="mt-2 ml-6" onClick={(e) => e.stopPropagation()}>
                        {linkedPursuit ? (
                          <div className="flex items-center gap-2">
                            {linkedPursuit.crm_url ? (
                              <a
                                href={linkedPursuit.crm_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 hover:underline"
                                style={{ color: 'var(--scout-trail)' }}
                              >
                                🔗 Linked to: {linkedPursuit.name}
                              </a>
                            ) : (
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--scout-trail)' }}>
                                🔗 Linked to: {linkedPursuit.name}
                              </span>
                            )}
                            <button
                              onClick={() => handleLinkSpark(spark.spark_id, null)}
                              className="text-[10px] px-1 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: 'var(--scout-earth-light)' }}
                            >
                              unlink
                            </button>
                          </div>
                        ) : isLinking ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="text-xs px-2 py-1 rounded border"
                              style={{ borderColor: 'var(--scout-border)' }}
                              onChange={(e) => {
                                if (e.target.value) handleLinkSpark(spark.spark_id, e.target.value)
                              }}
                              defaultValue=""
                            >
                              <option value="">Select CRM deal...</option>
                              {pursuits.filter(p => !getLinkedSpark(p.pursuit_id)).map(p => (
                                <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setLinkingSparkId(null)}
                              className="text-xs hover:underline"
                              style={{ color: 'var(--scout-earth-light)' }}
                            >
                              cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setLinkingSparkId(spark.spark_id) }}
                            className="text-xs flex items-center gap-1 hover:underline"
                            style={{ color: 'var(--scout-sky)' }}
                          >
                            ○ Link to CRM
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleCreateTrail}
              className="w-full py-2 text-sm rounded-lg border mt-2 hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
            >
              🔥 Blaze New Trail
            </button>
          </div>

          {/* Recon (Intelligence/Signals) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Recon ({signals.length})
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="account_signals table" />
                <button
                  onClick={() => setIsAddingSignal(!isAddingSignal)}
                  className="text-sm px-2 py-0.5 rounded border hover:bg-gray-50"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add Signal Form */}
            {isAddingSignal && (
              <div
                className="mb-3 p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <input
                  type="text"
                  value={newSignal.title}
                  onChange={(e) => setNewSignal({ ...newSignal, title: e.target.value })}
                  placeholder="Signal headline..."
                  className="w-full px-2 py-1.5 rounded border text-xs mb-2"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
                <div className="flex gap-2 mb-2">
                  <select
                    value={newSignal.type}
                    onChange={(e) => setNewSignal({ ...newSignal, type: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="buying_signal">💼 Buying Signal</option>
                    <option value="news">📰 News</option>
                    <option value="org_change">🏢 Org Change</option>
                    <option value="funding">💰 Funding</option>
                    <option value="expansion">📈 Expansion</option>
                    <option value="competitor">⚔️ Competitor</option>
                    <option value="trigger">🎯 Trigger Event</option>
                  </select>
                  <input
                    type="text"
                    value={newSignal.source}
                    onChange={(e) => setNewSignal({ ...newSignal, source: e.target.value })}
                    placeholder="Source URL..."
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSignal}
                    disabled={savingSignal || !newSignal.title.trim()}
                    className="px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-trail)' }}
                  >
                    {savingSignal ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setIsAddingSignal(false); setNewSignal({ title: '', type: 'buying_signal', source: '' }) }}
                    className="px-2 py-1 text-xs rounded border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {signals.length === 0 && !isAddingSignal ? (
              <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
                No intelligence gathered yet. Add signals to track market activity.
              </p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {signals.slice(0, 6).map((signal) => (
                  <div
                    key={signal.signal_id}
                    className="p-2 rounded text-xs group"
                    style={{ backgroundColor: 'var(--scout-parchment)' }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0">{getSignalIcon(signal.type)}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                          {signal.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] capitalize"
                            style={{ backgroundColor: 'rgba(74, 144, 164, 0.1)', color: 'var(--scout-sky)' }}
                          >
                            {signal.type.replace('_', ' ')}
                          </span>
                          {signal.date && (
                            <span style={{ color: 'var(--scout-earth-light)' }}>
                              {new Date(signal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSignal(signal.signal_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                        style={{ color: 'var(--scout-clay)' }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {signals.length > 6 && (
                  <p className="text-xs pt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    +{signals.length - 6} more signals
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setIsAddingSignal(true)}
              className="mt-3 text-xs hover:underline"
              style={{ color: 'var(--scout-sky)' }}
            >
              + Add Signal
            </button>
          </div>

          {/* Compass (Stakeholders) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Compass ({stakeholders.length})
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="stakeholders table" />
                <button
                  onClick={() => setIsAddingStakeholder(!isAddingStakeholder)}
                  className="text-sm px-2 py-0.5 rounded border hover:bg-gray-50"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add Stakeholder Form */}
            {isAddingStakeholder && (
              <div
                className="mb-3 p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <input
                  type="text"
                  value={newStakeholder.name}
                  onChange={(e) => setNewStakeholder({ ...newStakeholder, name: e.target.value })}
                  placeholder="Full name..."
                  className="w-full px-2 py-1.5 rounded border text-xs mb-2"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newStakeholder.title}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, title: e.target.value })}
                    placeholder="Job title..."
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  />
                  <select
                    value={newStakeholder.influence_level}
                    onChange={(e) => setNewStakeholder({ ...newStakeholder, influence_level: e.target.value })}
                    className="px-2 py-1 text-xs border rounded"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    <option value="high">High Influence</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddStakeholder}
                    disabled={savingStakeholder || !newStakeholder.name.trim()}
                    className="px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-trail)' }}
                  >
                    {savingStakeholder ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setIsAddingStakeholder(false); setNewStakeholder({ name: '', title: '', influence_level: 'medium' }) }}
                    className="px-2 py-1 text-xs rounded border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {stakeholders.length === 0 && !isAddingStakeholder ? (
              <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
                No guides identified yet. Add key people to map relationships.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {stakeholders.slice(0, 5).map((stakeholder) => (
                  <div
                    key={stakeholder.stakeholder_id}
                    className="p-2 rounded text-xs flex items-center gap-2 group"
                    style={{ backgroundColor: 'var(--scout-parchment)' }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          stakeholder.influence_level === 'high'
                            ? 'var(--scout-trail)'
                            : stakeholder.influence_level === 'medium'
                              ? 'var(--scout-sky)'
                              : 'var(--scout-earth-light)',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                        {stakeholder.name}
                      </span>
                      {stakeholder.title && (
                        <span className="ml-1" style={{ color: 'var(--scout-earth-light)' }}>
                          · {stakeholder.title}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteStakeholder(stakeholder.stakeholder_id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      style={{ color: 'var(--scout-clay)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {stakeholders.length > 5 && (
                  <p className="text-xs pt-1" style={{ color: 'var(--scout-earth-light)' }}>
                    +{stakeholders.length - 5} more
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                High: {highInfluence} │ Med: {medInfluence}
              </p>
              <button
                onClick={() => setIsAddingStakeholder(true)}
                className="text-xs hover:underline"
                style={{ color: 'var(--scout-sky)' }}
              >
                + Add Person
              </button>
            </div>
          </div>

          {/* Terrain (Org Structure) */}
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
                Terrain ({divisions.length})
              </h3>
              <div className="flex items-center gap-2">
                <DataAnnotation source="account_divisions table" />
                <button
                  onClick={() => setIsAddingDivision(!isAddingDivision)}
                  className="text-sm px-2 py-0.5 rounded border hover:bg-gray-50"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add Division Form */}
            {isAddingDivision && (
              <div
                className="mb-3 p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <input
                  type="text"
                  value={newDivision.name}
                  onChange={(e) => setNewDivision({ ...newDivision, name: e.target.value })}
                  placeholder="Division name..."
                  className="w-full px-2 py-1.5 rounded border text-xs mb-2"
                  style={{ borderColor: 'var(--scout-border)' }}
                  autoFocus
                />
                <input
                  type="text"
                  value={newDivision.description}
                  onChange={(e) => setNewDivision({ ...newDivision, description: e.target.value })}
                  placeholder="Description (optional)..."
                  className="w-full px-2 py-1.5 rounded border text-xs mb-2"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddDivision}
                    disabled={savingDivision || !newDivision.name.trim()}
                    className="px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--scout-trail)' }}
                  >
                    {savingDivision ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setIsAddingDivision(false); setNewDivision({ name: '', description: '' }) }}
                    className="px-2 py-1 text-xs rounded border"
                    style={{ borderColor: 'var(--scout-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {divisions.length === 0 && !isAddingDivision ? (
              <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
                No terrain mapped yet. Add divisions to understand the org structure.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {/* Show hierarchical structure - top level first */}
                {divisions
                  .filter(d => !d.parent_division_id)
                  .map((division) => {
                    const children = divisions.filter(d => d.parent_division_id === division.division_id)
                    const stakeholderCount = stakeholders.filter(s => s.division_id === division.division_id).length
                    return (
                      <div key={division.division_id}>
                        <div
                          className="p-2 rounded text-xs group flex items-center"
                          style={{ backgroundColor: 'var(--scout-parchment)' }}
                        >
                          <div className="flex-1">
                            <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                              🏛️ {division.name}
                            </span>
                            {stakeholderCount > 0 && (
                              <span className="ml-1 text-[10px]" style={{ color: 'var(--scout-sky)' }}>
                                · {stakeholderCount} contacts
                              </span>
                            )}
                            {division.description && (
                              <p className="mt-0.5 truncate" style={{ color: 'var(--scout-earth-light)' }}>
                                {division.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteDivision(division.division_id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                            style={{ color: 'var(--scout-clay)' }}
                          >
                            ×
                          </button>
                        </div>
                        {/* Child divisions */}
                        {children.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {children.map((child) => {
                              const childStakeholderCount = stakeholders.filter(s => s.division_id === child.division_id).length
                              return (
                                <div
                                  key={child.division_id}
                                  className="p-2 rounded text-xs group flex items-center"
                                  style={{ backgroundColor: 'rgba(247, 243, 235, 0.5)' }}
                                >
                                  <div className="flex-1">
                                    <span className="text-[10px] mr-1">↳</span>
                                    <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                                      {child.name}
                                    </span>
                                    {childStakeholderCount > 0 && (
                                      <span className="ml-1 text-[10px]" style={{ color: 'var(--scout-sky)' }}>
                                        · {childStakeholderCount} contacts
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteDivision(child.division_id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                                    style={{ color: 'var(--scout-clay)' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}

            <button
              onClick={() => setIsAddingDivision(true)}
              className="mt-3 text-xs hover:underline"
              style={{ color: 'var(--scout-sky)' }}
            >
              + Add Division
            </button>
          </div>
        </div>
      </div>

      {/* Trail Drawer */}
      {accountPlanId && (
        <TrailDrawer
          isOpen={isTrailDrawerOpen}
          onClose={() => { setIsTrailDrawerOpen(false); setSelectedTrail(null) }}
          trail={selectedTrail}
          accountPlanId={accountPlanId}
          pursuits={pursuits}
          onSave={handleTrailSave}
          onDelete={handleTrailDelete}
          mode={isCreatingTrail ? 'create' : 'edit'}
        />
      )}
    </div>
  )
}

function BucketSection({
  label,
  count,
  expanded,
  onToggle,
  items,
  editingAction,
  onEditAction,
  onUpdateAction,
  onDeleteAction,
  onToggleStatus,
  savingAction,
}: {
  label: string
  count: number
  expanded: boolean
  onToggle: () => void
  items: ActionItem[]
  editingAction: ActionItem | null
  onEditAction: (action: ActionItem | null) => void
  onUpdateAction: (action: ActionItem) => void
  onDeleteAction: (actionId: string) => void
  onToggleStatus: (action: ActionItem) => void
  savingAction: boolean
}) {
  return (
    <div className="mb-2">
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
        <div className="ml-6 mt-2 space-y-2">
          <DataAnnotation note={`Items due in ${label.replace(' Days', '')} days`} inline />
          {items.map((item) => {
            const isEditing = editingAction?.action_id === item.action_id
            return (
              <div
                key={item.action_id}
                className="p-2 rounded group"
                style={{ backgroundColor: 'var(--scout-parchment)' }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingAction.title}
                      onChange={(e) => onEditAction({ ...editingAction, title: e.target.value })}
                      className="w-full px-2 py-1 text-sm border rounded"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdateAction(editingAction)}
                        disabled={savingAction}
                        className="px-2 py-1 text-xs rounded text-white disabled:opacity-50"
                        style={{ backgroundColor: 'var(--scout-trail)' }}
                      >
                        {savingAction ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => onEditAction(null)}
                        className="px-2 py-1 text-xs rounded border"
                        style={{ borderColor: 'var(--scout-border)' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onDeleteAction(item.action_id)}
                        className="px-2 py-1 text-xs rounded hover:bg-red-50"
                        style={{ color: 'var(--scout-clay)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleStatus(item)}
                        className="flex-shrink-0"
                        title={item.status === 'completed' ? 'Mark pending' : 'Mark complete'}
                      >
                        {item.status === 'completed' ? (
                          <span style={{ color: 'var(--scout-trail)' }}>✓</span>
                        ) : (
                          <span>○</span>
                        )}
                      </button>
                      <span
                        className="text-sm cursor-pointer hover:underline"
                        style={{
                          color: 'var(--scout-saddle)',
                          textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                          opacity: item.status === 'completed' ? 0.6 : 1,
                        }}
                        onClick={() => onEditAction(item)}
                      >
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        ~{new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <button
                        onClick={() => onEditAction(item)}
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
                        style={{ color: 'var(--scout-sky)' }}
                      >
                        Edit
                      </button>
                    </div>
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
