'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MultiDealSelector } from './MultiDealSelector'

interface Risk {
  risk_id: string
  description: string
  severity: string
  pursuit_id?: string
  pursuit_ids?: string[]
  impact_on_bant?: string
  target_date?: string
  mitigation?: string
}

interface Action {
  action_id: string
  title: string
  status?: string
  due_date?: string
  priority?: string
}

interface Bucket {
  bucket_id: string
  name: string
  color: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface RiskCardProps {
  risk: Risk
  pursuitName?: string
  pursuitNames?: string[]
  accountPlanId: string
  buckets?: Bucket[]
  pursuits?: Pursuit[]
  linkedActions?: Action[]
}

export function RiskCard({ risk, pursuitName, pursuitNames, accountPlanId, buckets = [], pursuits = [], linkedActions = [] }: RiskCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [editData, setEditData] = useState({
    description: risk.description,
    severity: risk.severity,
    mitigation: risk.mitigation || '',
    target_date: risk.target_date || '',
  })
  // Initialize with existing pursuit_ids or fall back to single pursuit_id
  const [editPursuitIds, setEditPursuitIds] = useState<string[]>(
    risk.pursuit_ids || (risk.pursuit_id ? [risk.pursuit_id] : [])
  )

  const handleSave = async () => {
    try {
      // Update risk data
      const response = await fetch(`/api/accounts/${accountPlanId}/risks/${risk.risk_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        // Update linked deals via junction table
        // First clear existing, then add new ones
        for (const oldId of (risk.pursuit_ids || (risk.pursuit_id ? [risk.pursuit_id] : []))) {
          if (!editPursuitIds.includes(oldId)) {
            await fetch(`/api/accounts/${accountPlanId}/risks/${risk.risk_id}/pursuits?pursuit_id=${oldId}`, {
              method: 'DELETE',
            })
          }
        }
        for (const newId of editPursuitIds) {
          if (!(risk.pursuit_ids || []).includes(newId) && newId !== risk.pursuit_id) {
            await fetch(`/api/accounts/${accountPlanId}/risks/${risk.risk_id}/pursuits`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pursuit_id: newId }),
            })
          }
        }

        setIsEditing(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update risk:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this risk?')) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/risks/${risk.risk_id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete risk:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResolve = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/risks/${risk.risk_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'mitigated' }),
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to resolve risk:', error)
    }
  }

  const handleTagToBucket = async (bucketId: string) => {
    setShowTagMenu(false)
    try {
      await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'risk',
          item_id: risk.risk_id,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Error tagging to bucket:', error)
    }
  }

  // Get display names for linked deals
  const linkedDealNames = pursuitNames || (pursuitName ? [pursuitName] : [])

  if (isEditing) {
    return (
      <div
        className="p-2.5 rounded-lg border"
        style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      >
        <div className="space-y-2">
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="w-full text-xs p-2 rounded border resize-none"
            style={{ borderColor: 'var(--scout-border)' }}
            rows={2}
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={editData.severity}
              onChange={(e) => setEditData({ ...editData, severity: e.target.value })}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input
              type="date"
              value={editData.target_date}
              onChange={(e) => setEditData({ ...editData, target_date: e.target.value })}
              className="text-xs border rounded px-2 py-1"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Target date"
            />
          </div>
          {/* Multi-deal selector */}
          {pursuits.length > 0 && (
            <MultiDealSelector
              pursuits={pursuits}
              selectedIds={editPursuitIds}
              onChange={setEditPursuitIds}
              label="Linked Deals"
              compact
            />
          )}
          <input
            type="text"
            value={editData.mitigation}
            onChange={(e) => setEditData({ ...editData, mitigation: e.target.value })}
            placeholder="Mitigation plan (optional)"
            className="w-full text-xs p-2 rounded border"
            style={{ borderColor: 'var(--scout-border)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 rounded text-white"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs px-3 py-1"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-2 rounded-lg group ${isDeleting ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: risk.severity === 'critical' || risk.severity === 'high'
          ? 'rgba(169, 68, 66, 0.08)'
          : 'var(--scout-parchment)',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: risk.severity === 'critical' ? 'var(--scout-clay)'
                  : risk.severity === 'high' ? 'rgba(169, 68, 66, 0.2)'
                  : risk.severity === 'medium' ? 'rgba(210, 105, 30, 0.2)'
                  : 'rgba(93, 122, 93, 0.2)',
                color: risk.severity === 'critical' ? 'white'
                  : risk.severity === 'high' ? 'var(--scout-clay)'
                  : risk.severity === 'medium' ? 'var(--scout-sunset)'
                  : 'var(--scout-trail)',
              }}
            >
              {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
            </span>
            {risk.impact_on_bant && (
              <span
                className="text-[10px] px-1 py-0.5 rounded font-bold"
                style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
              >
                {risk.impact_on_bant}
              </span>
            )}
            <span className="text-xs flex-1 truncate" style={{ color: 'var(--scout-earth)' }}>
              {risk.description}
            </span>
          </div>
          {/* Show linked deals */}
          {linkedDealNames.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {linkedDealNames.map((name, idx) => (
                <span
                  key={idx}
                  className="text-[9px] px-1 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          {risk.mitigation && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--scout-earth-light)' }}>
              ↳ {risk.mitigation}
            </p>
          )}
          {/* Linked Actions */}
          {linkedActions.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--scout-sky)' }}
              >
                <svg className={`w-2.5 h-2.5 transition-transform ${showActions ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {linkedActions.length} Action{linkedActions.length !== 1 ? 's' : ''} linked
                <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}>
                  {linkedActions.filter(a => a.status === 'completed' || a.status === 'Completed').length}/{linkedActions.length}
                </span>
              </button>
              {showActions && (
                <div className="mt-1 space-y-0.5 pl-3 border-l-2" style={{ borderColor: 'var(--scout-sky)' }}>
                  {linkedActions.map(action => {
                    const isComplete = action.status === 'completed' || action.status === 'Completed'
                    return (
                      <div
                        key={action.action_id}
                        className="flex items-center gap-1.5 text-[10px]"
                      >
                        <span style={{ color: isComplete ? 'var(--scout-trail)' : 'var(--scout-earth-light)' }}>
                          {isComplete ? '✓' : '○'}
                        </span>
                        <span
                          className={isComplete ? 'line-through' : ''}
                          style={{ color: isComplete ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
                        >
                          {action.title}
                        </span>
                        {action.due_date && !isComplete && (
                          <span className="text-[9px]" style={{ color: 'var(--scout-earth-light)' }}>
                            {new Date(action.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - visible on hover */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleResolve}
            className="p-1 rounded hover:bg-green-100 transition-colors"
            title="Mark as mitigated"
          >
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Edit risk"
          >
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {/* Tag to bucket */}
          {buckets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Tag to bucket"
              >
                <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
              {showTagMenu && (
                <div
                  className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg border z-10 min-w-32"
                  style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                >
                  {buckets.map(bucket => (
                    <button
                      key={bucket.bucket_id}
                      onClick={() => handleTagToBucket(bucket.bucket_id)}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: `var(--scout-${bucket.color})` }}
                      />
                      {bucket.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-100 transition-colors"
            title="Delete risk"
          >
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
