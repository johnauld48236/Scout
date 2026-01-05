'use client'

import { useState } from 'react'

interface Pursuit {
  pursuit_id: string
  name: string
}

interface MultiDealSelectorProps {
  pursuits: Pursuit[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label?: string
  compact?: boolean
}

export function MultiDealSelector({
  pursuits,
  selectedIds,
  onChange,
  label = 'Linked Deals',
  compact = false,
}: MultiDealSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (pursuitId: string) => {
    if (selectedIds.includes(pursuitId)) {
      onChange(selectedIds.filter(id => id !== pursuitId))
    } else {
      onChange([...selectedIds, pursuitId])
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === pursuits.length) {
      onChange([])
    } else {
      onChange(pursuits.map(p => p.pursuit_id))
    }
  }

  const selectedNames = selectedIds
    .map(id => pursuits.find(p => p.pursuit_id === id)?.name)
    .filter(Boolean)

  if (pursuits.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {!compact && (
        <label className="block text-xs mb-1" style={{ color: 'var(--scout-earth-light)' }}>
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left border rounded flex items-center justify-between ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
        style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
      >
        <span className="truncate" style={{ color: selectedIds.length > 0 ? 'var(--scout-earth)' : 'var(--scout-earth-light)' }}>
          {selectedIds.length === 0
            ? 'None selected'
            : selectedIds.length === pursuits.length
              ? 'All deals'
              : selectedIds.length === 1
                ? selectedNames[0]
                : `${selectedIds.length} deals selected`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div
            className="absolute z-20 mt-1 w-full rounded-lg shadow-lg border py-1 max-h-48 overflow-y-auto"
            style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
          >
            {/* Select All Option */}
            <button
              type="button"
              onClick={handleSelectAll}
              className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 border-b"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <input
                type="checkbox"
                checked={selectedIds.length === pursuits.length}
                onChange={() => {}}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: 'var(--scout-sky)' }}
              />
              <span className="font-medium" style={{ color: 'var(--scout-earth)' }}>
                {selectedIds.length === pursuits.length ? 'Deselect All' : 'Select All Deals'}
              </span>
            </button>

            {/* Individual Pursuits */}
            {pursuits.map(pursuit => (
              <button
                key={pursuit.pursuit_id}
                type="button"
                onClick={() => handleToggle(pursuit.pursuit_id)}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(pursuit.pursuit_id)}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 rounded"
                  style={{ accentColor: 'var(--scout-sky)' }}
                />
                <span className="truncate" style={{ color: 'var(--scout-earth)' }}>
                  {pursuit.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected Pills (shown below when there are selections) */}
      {selectedIds.length > 0 && selectedIds.length < pursuits.length && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedNames.slice(0, 3).map((name, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
            >
              {name}
            </span>
          ))}
          {selectedNames.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5" style={{ color: 'var(--scout-earth-light)' }}>
              +{selectedNames.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
