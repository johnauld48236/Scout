'use client'

import { useState } from 'react'
import { SignalItem, PRIORITY_CONFIG, Initiative } from './types'
import { ItemEditModal } from './ItemEditModal'

interface SignalBucketProps {
  title: string
  icon: string
  items: SignalItem[]
  itemType: SignalItem['item_type']
  initiatives: Initiative[]
  accountPlanId: string
  showClosed?: boolean
  onRefresh: () => void
  emptyMessage?: string
  annotation?: string
}

export function SignalBucket({
  title,
  icon,
  items,
  itemType,
  initiatives,
  accountPlanId,
  showClosed = false,
  onRefresh,
  emptyMessage = 'No items',
  annotation,
}: SignalBucketProps) {
  const [selectedItem, setSelectedItem] = useState<SignalItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)

  const displayItems = showClosed
    ? items
    : items.filter(i => i.status !== 'closed' && i.status !== 'completed')

  const closedCount = items.filter(i => i.status === 'closed' || i.status === 'completed').length

  const handleItemClick = (item: SignalItem) => {
    setSelectedItem(item)
    setIsAddingNew(false)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setSelectedItem(null)
    setIsAddingNew(true)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setIsAddingNew(false)
  }

  const getPriorityDisplay = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]
    return config || { icon: '○', color: 'var(--scout-earth-light)' }
  }

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null
    const colors: Record<string, { bg: string; text: string }> = {
      critical: { bg: 'rgba(169, 68, 66, 0.1)', text: 'var(--scout-clay)' },
      high: { bg: 'rgba(210, 105, 30, 0.1)', text: 'var(--scout-sunset)' },
      medium: { bg: 'rgba(93, 122, 93, 0.1)', text: 'var(--scout-trail)' },
      low: { bg: 'var(--scout-parchment)', text: 'var(--scout-earth-light)' },
    }
    const style = colors[severity] || colors.medium
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded capitalize"
        style={{ backgroundColor: style.bg, color: style.text }}
      >
        {severity}
      </span>
    )
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)' }}>
            {title}
          </h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
          >
            {displayItems.length}
          </span>
        </div>
        <button
          onClick={handleAddNew}
          className="text-xs px-2 py-0.5 rounded border hover:bg-gray-50"
          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
        >
          +
        </button>
      </div>

      {annotation && (
        <p className="text-[10px] mb-2" style={{ color: 'var(--scout-earth-light)' }}>
          {annotation}
        </p>
      )}

      {/* Items List */}
      {displayItems.length === 0 ? (
        <p className="text-xs py-3" style={{ color: 'var(--scout-earth-light)' }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {displayItems.map(item => {
            const priority = getPriorityDisplay(item.priority)
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-2 rounded cursor-pointer transition-colors hover:bg-gray-50 group"
                style={{ backgroundColor: 'var(--scout-parchment)' }}
              >
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">{priority.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{
                        color: item.status === 'closed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)',
                        textDecoration: item.status === 'closed' ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {getSeverityBadge(item.severity)}
                      {item.initiative_id ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--scout-sky)' }}>
                          📁 In initiative
                        </span>
                      ) : item.due_date ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)', color: 'var(--scout-trail)' }}>
                          📋 In Plan
                        </span>
                      ) : null}
                      {item.due_date && (
                        <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                          {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    Edit
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Closed items toggle */}
      {closedCount > 0 && !showClosed && (
        <button
          className="mt-3 text-xs"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          + {closedCount} closed
        </button>
      )}

      {/* Modal */}
      <ItemEditModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
        initiatives={initiatives}
        accountPlanId={accountPlanId}
        itemType={selectedItem?.item_type || itemType}
        onSave={onRefresh}
        onDelete={onRefresh}
      />
    </div>
  )
}
