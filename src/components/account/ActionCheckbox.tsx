'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Bucket {
  bucket_id: string
  name: string
  color: string
}

interface ActionCheckboxProps {
  actionId: string
  title: string
  dueDate?: string
  priority?: string
  pursuitName?: string
  isCompleted?: boolean
  accountId?: string
  buckets?: Bucket[]
  isOverdue?: boolean
}

export function ActionCheckbox({
  actionId,
  title,
  dueDate,
  priority,
  pursuitName,
  isCompleted: initialCompleted = false,
  accountId,
  buckets = [],
  isOverdue = false,
}: ActionCheckboxProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    const newStatus = isCompleted ? 'Open' : 'Completed'
    setIsCompleted(!isCompleted)

    try {
      const response = await fetch('/api/action-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          status: newStatus,
        }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        setIsCompleted(isCompleted)
        console.error('Failed to update action status')
      }
    } catch (error) {
      setIsCompleted(isCompleted)
      console.error('Error updating action:', error)
    }
  }

  const handleEdit = async () => {
    if (!editValue.trim() || editValue === title) {
      setIsEditing(false)
      setEditValue(title)
      return
    }

    try {
      const response = await fetch('/api/action-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_id: actionId,
          title: editValue.trim(),
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Error updating action:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this action?')) return

    try {
      const response = await fetch('/api/action-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId }),
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (error) {
      console.error('Error deleting action:', error)
    }
  }

  const handleTagToBucket = async (bucketId: string) => {
    if (!accountId) return
    setShowTagMenu(false)

    try {
      await fetch(`/api/accounts/${accountId}/buckets/${bucketId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'action',
          item_id: actionId,
        }),
      })
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Error tagging to bucket:', error)
    }
  }

  const getPriorityStyle = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high':
        return { backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }
      case 'medium':
        return { backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }
      case 'low':
        return { backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }
      default:
        return { backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth)' }
    }
  }

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-opacity ${isPending ? 'opacity-50' : ''}`}
      style={{ borderColor: 'var(--scout-border)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowTagMenu(false) }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleToggle}
          disabled={isPending}
          className="w-4 h-4 rounded cursor-pointer shrink-0"
          style={{ accentColor: 'var(--scout-trail)' }}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit()
                if (e.key === 'Escape') { setIsEditing(false); setEditValue(title) }
              }}
              onBlur={handleEdit}
              className="text-sm font-medium w-full px-1 py-0.5 border rounded"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-earth)' }}
              autoFocus
            />
          ) : (
            <p
              className={`text-sm font-medium truncate ${isCompleted ? 'line-through' : ''}`}
              style={{ color: isCompleted ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
            >
              {title}
            </p>
          )}
          {pursuitName && (
            <p className="text-xs truncate" style={{ color: 'var(--scout-earth-light)' }}>
              {pursuitName}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Hover actions */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-1 mr-2">
            {/* Edit */}
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded hover:bg-gray-100"
              title="Edit"
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
                  className="p-1 rounded hover:bg-gray-100"
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

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-50"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}

        {priority && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={getPriorityStyle(priority)}
          >
            {priority}
          </span>
        )}
        {dueDate && (
          <span
            className={`text-xs ${isOverdue ? 'font-medium' : ''}`}
            style={{ color: isOverdue ? 'var(--scout-clay)' : 'var(--scout-earth-light)' }}
          >
            {isOverdue && '⚠️ '}
            {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  )
}
