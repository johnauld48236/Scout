'use client'

import { useState } from 'react'

interface Spark {
  spark_id: string
  title: string
  description: string
  size: 'high' | 'medium' | 'low'
  status: string
  questions_to_explore: string[]
  linked_pursuit_id: string | null
  converted_to_pursuit_id: string | null
}

interface TrailsPanelProps {
  accountPlanId: string
  sparks: Spark[]
  onUpdate?: () => void
  useScoutTerminology?: boolean
}

const STATUS_OPTIONS = [
  { value: 'exploring', label: 'Scouting', scoutLabel: 'Scouting', color: 'var(--scout-earth-light)' },
  { value: 'linked', label: 'Linked', scoutLabel: 'Blazing', color: 'var(--scout-sunset)' },
  { value: 'converted', label: 'Converted', scoutLabel: 'Active', color: 'var(--scout-trail)' },
  { value: 'closed', label: 'Closed', scoutLabel: 'Closed', color: 'var(--scout-earth-light)' },
]

const SIZE_OPTIONS: Array<{ value: 'high' | 'medium' | 'low'; label: string; color: string }> = [
  { value: 'high', label: '$$$', color: 'var(--scout-trail)' },
  { value: 'medium', label: '$$', color: 'var(--scout-sky)' },
  { value: 'low', label: '$', color: 'var(--scout-sunset)' },
]

interface Pursuit {
  pursuit_id: string
  name: string
  stage?: string
  estimated_value?: number
}

interface TrailsPanelPropsExtended extends TrailsPanelProps {
  pursuits?: Pursuit[]
}

export function TrailsPanel({
  accountPlanId,
  sparks,
  onUpdate,
  useScoutTerminology = false,
  pursuits = [],
}: TrailsPanelPropsExtended) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ title: string; description: string; size: 'high' | 'medium' | 'low'; questions: string } | null>(null)
  const [newTrail, setNewTrail] = useState<{ title: string; description: string; size: 'high' | 'medium' | 'low'; questions: string }>({ title: '', description: '', size: 'medium', questions: '' })
  const [saving, setSaving] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState<string | null>(null)

  const labels = useScoutTerminology
    ? { item: 'Trail', items: 'Trails', add: 'Blaze New Trail', thesis: 'Thesis' }
    : { item: 'Spark', items: 'Sparks', add: 'Add Spark', thesis: 'Hypothesis' }

  const getStatusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    return useScoutTerminology ? opt?.scoutLabel : opt?.label
  }

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'var(--scout-earth-light)'
  }

  const getSizeInfo = (size: string) => {
    return SIZE_OPTIONS.find(s => s.value === size) || SIZE_OPTIONS[1]
  }

  const handleAddTrail = async () => {
    if (!newTrail.title.trim()) return
    setSaving(true)
    try {
      const questions = newTrail.questions.split('\n').filter(q => q.trim())
      const response = await fetch('/api/scout-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          title: newTrail.title.trim(),
          description: newTrail.description.trim(),
          size: newTrail.size,
          questions_to_explore: questions,
          status: 'exploring',
        }),
      })
      if (response.ok) {
        setNewTrail({ title: '', description: '', size: 'medium', questions: '' })
        setIsAdding(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add trail:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (sparkId: string, newStatus: string) => {
    try {
      await fetch(`/api/scout-themes/${sparkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDeleteTrail = async (sparkId: string) => {
    if (!confirm(`Archive this ${labels.item.toLowerCase()}?`)) return
    try {
      await fetch(`/api/scout-themes/${sparkId}`, { method: 'DELETE' })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to archive trail:', error)
    }
  }

  const handleStartEdit = (spark: Spark) => {
    setEditingId(spark.spark_id)
    setEditData({
      title: spark.title,
      description: spark.description,
      size: spark.size,
      questions: spark.questions_to_explore.join('\n'),
    })
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editData) return
    setSaving(true)
    try {
      const questions = editData.questions.split('\n').filter(q => q.trim())
      const response = await fetch(`/api/scout-themes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title.trim(),
          description: editData.description.trim(),
          size: editData.size,
          questions_to_explore: questions,
        }),
      })
      if (response.ok) {
        setEditingId(null)
        setEditData(null)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to update trail:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleLinkToCRM = async (sparkId: string, pursuitId: string | 'new') => {
    try {
      if (pursuitId === 'new') {
        // Find the spark to get its details for creating a new pursuit
        const spark = sparks.find(s => s.spark_id === sparkId)
        if (!spark) return

        // Create a new pursuit based on the trail
        const pursuitResponse = await fetch('/api/pursuits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_plan_id: accountPlanId,
            name: spark.title,
            description: spark.description,
            stage: 'Discovery',
            estimated_value: spark.size === 'high' ? 100000 : spark.size === 'medium' ? 50000 : 25000,
          }),
        })

        if (pursuitResponse.ok) {
          const newPursuit = await pursuitResponse.json()
          // Update the trail to link to the new pursuit and set status to converted
          await fetch(`/api/scout-themes/${sparkId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              linked_pursuit_id: newPursuit.pursuit_id,
              converted_to_pursuit_id: newPursuit.pursuit_id,
              status: 'converted',
            }),
          })
        }
      } else {
        // Link to existing pursuit
        await fetch(`/api/scout-themes/${sparkId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linked_pursuit_id: pursuitId,
            status: 'linked',
          }),
        })
      }
      setShowLinkModal(null)
      onUpdate?.()
    } catch (error) {
      console.error('Failed to link to CRM:', error)
    }
  }

  // Group by status
  const activeTrails = sparks.filter(s => s.status === 'exploring' || s.status === 'linked')
  const convertedTrails = sparks.filter(s => s.status === 'converted')
  const closedTrails = sparks.filter(s => s.status === 'closed')

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
        {useScoutTerminology
          ? 'Blaze trails - hypothesis-driven paths to winning. Each trail represents an opportunity thesis to explore and validate.'
          : 'Explore opportunity themes that could become deals. Each spark is a hypothesis to investigate.'}
      </p>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm px-3 py-1.5 rounded border hover:bg-gray-50"
          style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
        >
          🔥 {labels.add}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div
          className="p-4 rounded-lg border"
          style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
        >
          <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--scout-saddle)' }}>
            New {labels.item}
          </h4>
          <div className="space-y-3">
            <input
              type="text"
              value={newTrail.title}
              onChange={(e) => setNewTrail({ ...newTrail, title: e.target.value })}
              placeholder={`${labels.item} name...`}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              autoFocus
            />
            <textarea
              value={newTrail.description}
              onChange={(e) => setNewTrail({ ...newTrail, description: e.target.value })}
              placeholder={`${labels.thesis} - why this is a good opportunity...`}
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              rows={2}
            />
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--scout-earth)' }}>
                Estimated Value
              </label>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map(size => (
                  <button
                    key={size.value}
                    onClick={() => setNewTrail({ ...newTrail, size: size.value })}
                    className={`px-3 py-1.5 rounded border text-sm font-bold ${newTrail.size === size.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                    style={{
                      borderColor: 'var(--scout-border)',
                      color: size.color,
                    }}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--scout-earth)' }}>
                Questions to Explore (one per line)
              </label>
              <textarea
                value={newTrail.questions}
                onChange={(e) => setNewTrail({ ...newTrail, questions: e.target.value })}
                placeholder="What questions need answering?"
                className="w-full px-3 py-2 rounded border text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddTrail}
              disabled={saving || !newTrail.title.trim()}
              className="px-4 py-1.5 text-sm rounded text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {saving ? 'Creating...' : `Create ${labels.item}`}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewTrail({ title: '', description: '', size: 'medium', questions: '' }) }}
              className="px-3 py-1.5 text-sm rounded border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Trails List */}
      {sparks.length === 0 && !isAdding ? (
        <div
          className="p-8 rounded-lg border text-center"
          style={{ borderColor: 'var(--scout-border)', borderStyle: 'dashed' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
            {useScoutTerminology ? 'No trails blazed yet' : 'No sparks yet'}
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--scout-earth-light)' }}>
            {useScoutTerminology
              ? 'Start scouting opportunities in this territory'
              : 'Create opportunity hypotheses to explore'}
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm px-4 py-2 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
          >
            🔥 {labels.add}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {activeTrails.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                {useScoutTerminology ? 'Scouting & Blazing' : 'Active'} ({activeTrails.length})
              </h4>
              <div className="space-y-2">
                {activeTrails.map(spark => (
                  <TrailCard
                    key={spark.spark_id}
                    spark={spark}
                    labels={labels}
                    getStatusLabel={getStatusLabel}
                    getStatusColor={getStatusColor}
                    getSizeInfo={getSizeInfo}
                    onStatusChange={(status) => handleUpdateStatus(spark.spark_id, status)}
                    onDelete={() => handleDeleteTrail(spark.spark_id)}
                    onEdit={() => handleStartEdit(spark)}
                    onLinkToCRM={() => setShowLinkModal(spark.spark_id)}
                    isEditing={editingId === spark.spark_id}
                    editData={editingId === spark.spark_id ? editData : null}
                    onEditDataChange={setEditData}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    saving={saving}
                    useScoutTerminology={useScoutTerminology}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Converted/Active */}
          {convertedTrails.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--scout-trail)' }}>
                {useScoutTerminology ? 'Active (In CRM)' : 'Converted'} ({convertedTrails.length})
              </h4>
              <div className="space-y-2">
                {convertedTrails.map(spark => (
                  <TrailCard
                    key={spark.spark_id}
                    spark={spark}
                    labels={labels}
                    getStatusLabel={getStatusLabel}
                    getStatusColor={getStatusColor}
                    getSizeInfo={getSizeInfo}
                    onStatusChange={(status) => handleUpdateStatus(spark.spark_id, status)}
                    onDelete={() => handleDeleteTrail(spark.spark_id)}
                    onEdit={() => handleStartEdit(spark)}
                    onLinkToCRM={() => setShowLinkModal(spark.spark_id)}
                    isEditing={editingId === spark.spark_id}
                    editData={editingId === spark.spark_id ? editData : null}
                    onEditDataChange={setEditData}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    saving={saving}
                    useScoutTerminology={useScoutTerminology}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Closed */}
          {closedTrails.length > 0 && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                Closed ({closedTrails.length})
              </h4>
              <div className="space-y-2 opacity-60">
                {closedTrails.map(spark => (
                  <TrailCard
                    key={spark.spark_id}
                    spark={spark}
                    labels={labels}
                    getStatusLabel={getStatusLabel}
                    getStatusColor={getStatusColor}
                    getSizeInfo={getSizeInfo}
                    onStatusChange={(status) => handleUpdateStatus(spark.spark_id, status)}
                    onDelete={() => handleDeleteTrail(spark.spark_id)}
                    onEdit={() => handleStartEdit(spark)}
                    onLinkToCRM={() => setShowLinkModal(spark.spark_id)}
                    isEditing={editingId === spark.spark_id}
                    editData={editingId === spark.spark_id ? editData : null}
                    onEditDataChange={setEditData}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    saving={saving}
                    useScoutTerminology={useScoutTerminology}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Suggest */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'rgba(56, 152, 199, 0.05)', borderColor: 'var(--scout-sky)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
              AI {labels.item} Suggestions
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Let AI analyze signals and suggest opportunity {labels.items.toLowerCase()}.
            </p>
            <button
              className="mt-2 text-sm px-3 py-1.5 rounded border hover:bg-white/50"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
            >
              Suggest {labels.items}
            </button>
          </div>
        </div>
      </div>

      {/* Link to CRM Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowLinkModal(null)} />
          <div
            className="relative rounded-lg shadow-lg w-full max-w-sm p-4"
            style={{ backgroundColor: 'var(--scout-white)' }}
          >
            <h3 className="font-medium text-sm mb-3" style={{ color: 'var(--scout-saddle)' }}>
              {useScoutTerminology ? 'Connect Trail to CRM' : 'Link Spark to Pursuit'}
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleLinkToCRM(showLinkModal, 'new')}
                className="w-full px-3 py-2 text-sm text-left rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
              >
                + Create New {useScoutTerminology ? 'CRM Opportunity' : 'Pursuit'}
              </button>
              {pursuits.length > 0 && (
                <>
                  <div className="text-xs text-center py-1" style={{ color: 'var(--scout-earth-light)' }}>
                    or link to existing
                  </div>
                  {pursuits.map(p => (
                    <button
                      key={p.pursuit_id}
                      onClick={() => handleLinkToCRM(showLinkModal, p.pursuit_id)}
                      className="w-full px-3 py-2 text-sm text-left rounded border hover:bg-gray-50"
                      style={{ borderColor: 'var(--scout-border)' }}
                    >
                      <span style={{ color: 'var(--scout-saddle)' }}>{p.name}</span>
                      {p.stage && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                          ({p.stage})
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
            <button
              onClick={() => setShowLinkModal(null)}
              className="mt-3 w-full px-3 py-1.5 text-sm rounded border"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TrailCard({
  spark,
  labels,
  getStatusLabel,
  getStatusColor,
  getSizeInfo,
  onStatusChange,
  onDelete,
  onEdit,
  onLinkToCRM,
  isEditing,
  editData,
  onEditDataChange,
  onSaveEdit,
  onCancelEdit,
  saving,
  useScoutTerminology,
}: {
  spark: Spark
  labels: { item: string; items: string; add: string; thesis: string }
  getStatusLabel: (status: string) => string | undefined
  getStatusColor: (status: string) => string
  getSizeInfo: (size: string) => { value: string; label: string; color: string }
  onStatusChange: (status: string) => void
  onDelete: () => void
  onEdit: () => void
  onLinkToCRM: () => void
  isEditing: boolean
  editData: { title: string; description: string; size: 'high' | 'medium' | 'low'; questions: string } | null
  onEditDataChange: (data: { title: string; description: string; size: 'high' | 'medium' | 'low'; questions: string }) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  saving: boolean
  useScoutTerminology: boolean
}) {
  const [showDetails, setShowDetails] = useState(false)
  const sizeInfo = getSizeInfo(spark.size)

  // If in edit mode, render edit form
  if (isEditing && editData) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-trail)' }}
      >
        <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--scout-saddle)' }}>
          Edit {labels.item}
        </h4>
        <div className="space-y-3">
          <input
            type="text"
            value={editData.title}
            onChange={(e) => onEditDataChange({ ...editData, title: e.target.value })}
            placeholder={`${labels.item} name...`}
            className="w-full px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--scout-border)' }}
            autoFocus
          />
          <textarea
            value={editData.description}
            onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
            placeholder={`${labels.thesis} - why this is a good opportunity...`}
            className="w-full px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--scout-border)' }}
            rows={2}
          />
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--scout-earth)' }}>
              Estimated Value
            </label>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map(size => (
                <button
                  key={size.value}
                  onClick={() => onEditDataChange({ ...editData, size: size.value })}
                  className={`px-3 py-1.5 rounded border text-sm font-bold ${editData.size === size.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                  style={{
                    borderColor: 'var(--scout-border)',
                    color: size.color,
                  }}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--scout-earth)' }}>
              Questions to Explore (one per line)
            </label>
            <textarea
              value={editData.questions}
              onChange={(e) => onEditDataChange({ ...editData, questions: e.target.value })}
              placeholder="What questions need answering?"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onSaveEdit}
            disabled={saving || !editData.title.trim()}
            className="px-4 py-1.5 text-sm rounded text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--scout-trail)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onCancelEdit}
            className="px-3 py-1.5 text-sm rounded border"
            style={{ borderColor: 'var(--scout-border)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border group"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <span>💡</span>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                {spark.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${getStatusColor(spark.status)}20`, color: getStatusColor(spark.status) }}
                >
                  {getStatusLabel(spark.status)}
                </span>
                <span className="text-xs font-bold" style={{ color: sizeInfo.color }}>
                  {sizeInfo.label}
                </span>
                {spark.questions_to_explore.length > 0 && (
                  <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                    {spark.questions_to_explore.length} questions
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            {showDetails ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          {spark.description && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                {labels.thesis}
              </p>
              <p className="text-sm" style={{ color: 'var(--scout-saddle)' }}>
                {spark.description}
              </p>
            </div>
          )}

          {spark.questions_to_explore.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Questions to Explore
              </p>
              <ul className="space-y-1">
                {spark.questions_to_explore.map((q, i) => (
                  <li key={i} className="text-xs flex items-start gap-1" style={{ color: 'var(--scout-earth-light)' }}>
                    <span>•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <select
                value={spark.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="text-xs px-2 py-1 rounded border"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {useScoutTerminology ? opt.scoutLabel : opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
              >
                Edit
              </button>
              {!spark.linked_pursuit_id && !spark.converted_to_pursuit_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onLinkToCRM() }}
                  className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                  style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
                >
                  → {useScoutTerminology ? 'Connect CRM' : 'Link Pursuit'}
                </button>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="text-xs px-2 py-1 rounded hover:bg-red-50"
              style={{ color: 'var(--scout-clay)' }}
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
