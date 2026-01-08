'use client'

import { useState } from 'react'
import { SignalItem, Initiative, TIME_WINDOWS, PRIORITY_CONFIG, INITIATIVE_COLORS, getTimeWindowForDate, getDefaultDueDateForBucket } from './types'
import { ItemEditModal } from './ItemEditModal'
import { InitiativeModal } from './InitiativeModal'

interface TrackerSectionProps {
  title: string
  items: SignalItem[]
  initiatives: Initiative[]
  accountPlanId: string
  showClosed?: boolean
  onRefresh: () => void
  itemType?: SignalItem['item_type']
}

export function TrackerSection({
  title,
  items,
  initiatives,
  accountPlanId,
  showClosed = false,
  onRefresh,
  itemType = 'action_item',
}: TrackerSectionProps) {
  const [expandedWindows, setExpandedWindows] = useState<Record<string, boolean>>({
    this_week: true,
    next_week: false,
    this_month: false,
    backlog: false,
  })
  const [expandedInitiatives, setExpandedInitiatives] = useState<Record<string, boolean>>({})

  // Modal states
  const [selectedItem, setSelectedItem] = useState<SignalItem | null>(null)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null)
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [addingToBucket, setAddingToBucket] = useState<'30' | '60' | '90' | ''>('30')

  // Drag state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverWindow, setDragOverWindow] = useState<string | null>(null)

  const displayItems = showClosed
    ? items
    : items.filter(i => i.status !== 'closed' && i.status !== 'completed')

  const closedCount = items.filter(i => i.status === 'closed' || i.status === 'completed').length

  // Group items by time window
  const getItemsForWindow = (windowKey: string) => {
    return displayItems.filter(item => {
      if (item.initiative_id) return false // Items in initiatives shown separately
      const window = TIME_WINDOWS.find(w => w.key === windowKey)
      if (!window) return false
      const itemWindow = getTimeWindowForDate(item.due_date)
      return itemWindow === windowKey || (windowKey === 'backlog' && !item.bucket && !item.due_date)
    })
  }

  // Group items by initiative
  const getItemsForInitiative = (initiativeId: string) => {
    return displayItems.filter(item => item.initiative_id === initiativeId)
  }

  const activeInitiatives = initiatives.filter(i => i.status === 'active')
  const closedInitiatives = initiatives.filter(i => i.status !== 'active')

  const toggleWindow = (key: string) => {
    setExpandedWindows(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleInitiative = (id: string) => {
    setExpandedInitiatives(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Drag handlers
  const handleDragStart = (itemId: string) => {
    setDraggedItemId(itemId)
  }

  const handleDragOver = (e: React.DragEvent, windowKey: string) => {
    e.preventDefault()
    setDragOverWindow(windowKey)
  }

  const handleDragLeave = () => {
    setDragOverWindow(null)
  }

  const handleDrop = async (windowKey: string) => {
    if (!draggedItemId) return

    const window = TIME_WINDOWS.find(w => w.key === windowKey)
    if (!window) return

    const dueDate = getDefaultDueDateForBucket(window.bucket)

    try {
      await fetch(`/api/action-items/${draggedItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: window.bucket,
          due_date: dueDate.toISOString(),
          initiative_id: null, // Remove from initiative when moving to window
        }),
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to move item:', error)
    } finally {
      setDraggedItemId(null)
      setDragOverWindow(null)
    }
  }

  const handleDropToInitiative = async (initiativeId: string) => {
    if (!draggedItemId) return

    const initiative = initiatives.find(i => i.id === initiativeId)

    try {
      await fetch(`/api/action-items/${draggedItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiative_id: initiativeId,
          due_date: initiative?.due_date || null,
        }),
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to move item to initiative:', error)
    } finally {
      setDraggedItemId(null)
      setDragOverWindow(null)
    }
  }

  const handleItemClick = (item: SignalItem) => {
    setSelectedItem(item)
    setIsAddingItem(false)
    setIsItemModalOpen(true)
  }

  const handleAddItem = (bucket: '30' | '60' | '90' | '') => {
    setSelectedItem(null)
    setAddingToBucket(bucket)
    setIsAddingItem(true)
    setIsItemModalOpen(true)
  }

  const handleInitiativeClick = (initiative: Initiative) => {
    setSelectedInitiative(initiative)
    setIsInitiativeModalOpen(true)
  }

  const handleAddInitiative = () => {
    setSelectedInitiative(null)
    setIsInitiativeModalOpen(true)
  }

  const getInitiativeColor = (color: string) => {
    return INITIATIVE_COLORS.find(c => c.value === color) || INITIATIVE_COLORS[0]
  }

  const getPriorityIcon = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]
    return config?.icon || '○'
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddItem('30')}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Time Windows */}
      <div className="max-h-[400px] overflow-y-auto space-y-1">
        {TIME_WINDOWS.map(window => {
          const windowItems = getItemsForWindow(window.key)
          const isExpanded = expandedWindows[window.key]
          const isDragOver = dragOverWindow === window.key

          return (
            <div
              key={window.key}
              className={`transition-all ${isDragOver ? 'ring-2 ring-blue-400 rounded' : ''}`}
              onDragOver={(e) => handleDragOver(e, window.key)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(window.key)}
            >
              <button
                onClick={() => toggleWindow(window.key)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                  <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                    {window.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                  >
                    {windowItems.length}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddItem(window.bucket) }}
                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--scout-sky)' }}
                  >
                    +
                  </button>
                </div>
              </button>

              {isExpanded && windowItems.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {windowItems.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center justify-between p-2 rounded cursor-grab active:cursor-grabbing group hover:ring-1 hover:ring-gray-200"
                      style={{ backgroundColor: 'var(--scout-parchment)' }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span>{getPriorityIcon(item.priority)}</span>
                        <span
                          className="text-sm truncate"
                          style={{
                            color: item.status === 'completed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)',
                            textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                          }}
                        >
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.due_date && (
                          <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                            {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <span
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          style={{ color: 'var(--scout-sky)' }}
                        >
                          Edit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Initiatives Section */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--scout-saddle)' }}>
            📁 Initiatives ({activeInitiatives.length})
          </span>
          <button
            onClick={handleAddInitiative}
            className="text-xs px-2 py-0.5 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            +
          </button>
        </div>

        {activeInitiatives.length === 0 ? (
          <p className="text-xs py-2" style={{ color: 'var(--scout-earth-light)' }}>
            No active initiatives. Create one to group related items.
          </p>
        ) : (
          <div className="space-y-2">
            {activeInitiatives.map(initiative => {
              const initItems = getItemsForInitiative(initiative.id)
              const isExpanded = expandedInitiatives[initiative.id]
              const color = getInitiativeColor(initiative.color)
              const isDragOver = dragOverWindow === `init-${initiative.id}`

              return (
                <div
                  key={initiative.id}
                  className={`rounded-lg border transition-all ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                  style={{ backgroundColor: color.bg, borderColor: color.border }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverWindow(`init-${initiative.id}`) }}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDropToInitiative(initiative.id)}
                >
                  <button
                    onClick={() => toggleInitiative(initiative.id)}
                    className="w-full flex items-center justify-between p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                        {initiative.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        {initItems.length} items
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInitiativeClick(initiative) }}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--scout-sky)' }}
                      >
                        Edit
                      </button>
                    </div>
                  </button>

                  {isExpanded && initItems.length > 0 && (
                    <div className="px-2 pb-2 space-y-1">
                      {initItems.map(item => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(item.id)}
                          onClick={() => handleItemClick(item)}
                          className="flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-white/50"
                          style={{ backgroundColor: 'white' }}
                        >
                          <span>{getPriorityIcon(item.priority)}</span>
                          <span
                            className="text-sm flex-1 truncate"
                            style={{
                              color: item.status === 'completed' ? 'var(--scout-earth-light)' : 'var(--scout-saddle)',
                              textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Closed initiatives */}
        {closedInitiatives.length > 0 && showClosed && (
          <div className="mt-2">
            <p className="text-[10px] mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Closed ({closedInitiatives.length})
            </p>
            {closedInitiatives.map(initiative => (
              <div
                key={initiative.id}
                onClick={() => handleInitiativeClick(initiative)}
                className="p-2 rounded text-xs cursor-pointer hover:bg-gray-50"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                ✓ {initiative.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed items summary */}
      {closedCount > 0 && !showClosed && (
        <div className="mt-2 text-center">
          <button className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            + {closedCount} closed items
          </button>
        </div>
      )}

      {/* Item Modal */}
      <ItemEditModal
        isOpen={isItemModalOpen}
        onClose={() => { setIsItemModalOpen(false); setSelectedItem(null) }}
        item={isAddingItem ? { id: '', title: '', priority: 'P2', status: 'open', item_type: itemType, bucket: addingToBucket } as SignalItem : selectedItem}
        initiatives={initiatives}
        accountPlanId={accountPlanId}
        itemType={itemType}
        onSave={onRefresh}
        onDelete={onRefresh}
      />

      {/* Initiative Modal */}
      <InitiativeModal
        isOpen={isInitiativeModalOpen}
        onClose={() => { setIsInitiativeModalOpen(false); setSelectedInitiative(null) }}
        initiative={selectedInitiative}
        childItems={selectedInitiative ? getItemsForInitiative(selectedInitiative.id) : []}
        accountPlanId={accountPlanId}
        onSave={onRefresh}
        onDelete={onRefresh}
      />
    </div>
  )
}
