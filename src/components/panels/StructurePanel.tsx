'use client'

import { useState } from 'react'

interface Division {
  division_id: string
  name: string
  description?: string
  parent_division_id?: string | null
}

interface StructurePanelProps {
  accountPlanId: string
  divisions: Division[]
  onUpdate?: () => void
}

export function StructurePanel({ accountPlanId, divisions, onUpdate }: StructurePanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newDivisionName, setNewDivisionName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) return
    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/divisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDivisionName.trim() }),
      })
      if (response.ok) {
        setNewDivisionName('')
        setIsAdding(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add division:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDivision = async (divisionId: string) => {
    if (!confirm('Delete this division?')) return
    try {
      await fetch(`/api/accounts/${accountPlanId}/divisions/${divisionId}`, {
        method: 'DELETE',
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete division:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
          Map the corporate structure to understand how decisions flow and where opportunities exist.
        </p>
      </div>

      {/* Division List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
            Divisions ({divisions.length})
          </h3>
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            + Add Division
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <div
            className="p-3 rounded-lg border mb-3"
            style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
          >
            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="Division name..."
              className="w-full px-3 py-2 rounded border text-sm mb-2"
              style={{ borderColor: 'var(--scout-border)' }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddDivision}
                disabled={saving || !newDivisionName.trim()}
                className="px-3 py-1 text-sm rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
              <button
                onClick={() => { setIsAdding(false); setNewDivisionName('') }}
                className="px-3 py-1 text-sm rounded border"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Divisions */}
        {divisions.length === 0 ? (
          <div
            className="p-6 rounded-lg border text-center"
            style={{ borderColor: 'var(--scout-border)', borderStyle: 'dashed' }}
          >
            <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              No divisions mapped yet
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm px-4 py-2 rounded border hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
            >
              + Add First Division
            </button>
          </div>
        ) : (
          divisions.map((division) => (
            <div
              key={division.division_id}
              className="p-3 rounded-lg border flex items-center justify-between group"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                  {division.name}
                </p>
                {division.description && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                    {division.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeleteDivision(division.division_id)}
                className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                style={{ color: 'var(--scout-clay)' }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* AI Assist */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'rgba(56, 152, 199, 0.05)', borderColor: 'var(--scout-sky)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
              AI Structure Discovery
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Let AI research and suggest divisions based on public information about this company.
            </p>
            <button
              className="mt-2 text-sm px-3 py-1.5 rounded border hover:bg-white/50"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
            >
              Discover Structure
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
