'use client'

import { useState } from 'react'
import { X, Building2, User, Loader2 } from 'lucide-react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface DivisionSuggestion {
  id: string
  name: string
  description?: string
  division_type?: string
  products?: string[]
  headcount?: number
  key_focus_areas?: string[]
  selected?: boolean
}

interface StakeholderSuggestion {
  id: string
  name: string
  title?: string
  linkedin_url?: string
  source?: string
  selected?: boolean
}

interface CorporateStructure {
  headquarters?: string
  parent_company?: string
  ownership_type?: string
  stock_symbol?: string
  employee_count?: number
  annual_revenue?: string
  founded_year?: number
  ceo?: string
}

type SuggestionType = 'divisions' | 'stakeholders'

interface AISuggestionsDrawerProps {
  isOpen: boolean
  onClose: () => void
  type: SuggestionType
  accountId: string
  accountName: string
  onSaveComplete: () => void
}

export function AISuggestionsDrawer({
  isOpen,
  onClose,
  type,
  accountId,
  accountName,
  onSaveComplete,
}: AISuggestionsDrawerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [divisions, setDivisions] = useState<DivisionSuggestion[]>([])
  const [stakeholders, setStakeholders] = useState<StakeholderSuggestion[]>([])
  const [corporateStructure, setCorporateStructure] = useState<CorporateStructure | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      if (type === 'divisions') {
        const response = await fetch('/api/ai/enrich-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: accountName }),
        })

        if (!response.ok) throw new Error('Failed to fetch structure')

        const data = await response.json()
        setCorporateStructure(data.corporateStructure)
        setDivisions(
          (data.divisions || []).map((d: DivisionSuggestion) => ({
            ...d,
            selected: true,
          }))
        )
      } else {
        const response = await fetch('/api/ai/research-people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: accountName }),
        })

        if (!response.ok) throw new Error('Failed to fetch stakeholders')

        const data = await response.json()
        setStakeholders(
          (data.people || []).map((p: { name: string; title?: string; linkedin_url?: string }, i: number) => ({
            id: `person-${Date.now()}-${i}`,
            name: p.name,
            title: p.title,
            linkedin_url: p.linkedin_url,
            selected: true,
          }))
        )
      }
    } catch (err) {
      setError('Failed to get suggestions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleItem = (id: string) => {
    if (type === 'divisions') {
      setDivisions(divisions.map(d => d.id === id ? { ...d, selected: !d.selected } : d))
    } else {
      setStakeholders(stakeholders.map(s => s.id === id ? { ...s, selected: !s.selected } : s))
    }
  }

  const handleSelectAll = () => {
    if (type === 'divisions') {
      const allSelected = divisions.every(d => d.selected)
      setDivisions(divisions.map(d => ({ ...d, selected: !allSelected })))
    } else {
      const allSelected = stakeholders.every(s => s.selected)
      setStakeholders(stakeholders.map(s => ({ ...s, selected: !allSelected })))
    }
  }

  const handleRemoveItem = (id: string) => {
    if (type === 'divisions') {
      setDivisions(divisions.filter(d => d.id !== id))
    } else {
      setStakeholders(stakeholders.filter(s => s.id !== id))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      if (type === 'divisions') {
        const selectedDivisions = divisions.filter(d => d.selected)

        // Save corporate structure first if available
        if (corporateStructure) {
          await fetch(`/api/accounts/${accountId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              headquarters: corporateStructure.headquarters,
              employee_count: corporateStructure.employee_count,
              corporate_structure: corporateStructure,
            }),
          })
        }

        // Save each division
        for (const division of selectedDivisions) {
          await fetch(`/api/accounts/${accountId}/divisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: division.name,
              description: division.description,
              division_type: division.division_type || 'division',
              products: division.products,
              headcount: division.headcount,
              key_focus_areas: division.key_focus_areas,
            }),
          })
        }
      } else {
        const selectedStakeholders = stakeholders.filter(s => s.selected)

        for (const person of selectedStakeholders) {
          await fetch('/api/stakeholders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              account_plan_id: accountId,
              full_name: person.name,
              title: person.title,
              linkedin_url: person.linkedin_url,
              role_type: 'Unknown',
              sentiment: 'neutral',
            }),
          })
        }
      }

      onSaveComplete()
      handleClose()
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setDivisions([])
    setStakeholders([])
    setCorporateStructure(null)
    setHasSearched(false)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const items = type === 'divisions' ? divisions : stakeholders
  const selectedCount = items.filter(i => i.selected).length

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

      {/* Drawer */}
      <div
        className="relative w-full max-w-xl bg-white shadow-xl flex flex-col"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <div className="flex items-center gap-3">
            <ScoutAIIcon size={24} />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                {type === 'divisions' ? 'Map Structure with AI' : 'Find People with AI'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {accountName}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: 'var(--scout-earth)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasSearched ? (
            // Initial state - show search button
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)' }}
              >
                {type === 'divisions' ? (
                  <Building2 className="w-8 h-8" style={{ color: 'var(--scout-trail)' }} />
                ) : (
                  <User className="w-8 h-8" style={{ color: 'var(--scout-trail)' }} />
                )}
              </div>
              <p className="text-sm text-center" style={{ color: 'var(--scout-earth)' }}>
                {type === 'divisions'
                  ? 'AI will research divisions, business units, and products'
                  : 'AI will search for key contacts and leadership'}
              </p>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                <ScoutAIIcon size={18} className="text-white" />
                Start Research
              </button>
            </div>
          ) : isLoading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--scout-trail)' }} />
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Researching {accountName}...
              </p>
            </div>
          ) : items.length === 0 ? (
            // No results
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                No {type === 'divisions' ? 'divisions' : 'people'} found.
              </p>
              <button
                onClick={handleSearch}
                className="text-sm font-medium"
                style={{ color: 'var(--scout-sky)' }}
              >
                Try again
              </button>
            </div>
          ) : (
            // Show results - clean list format like onboarding wizard
            <div className="space-y-4">
              {/* Header with select all */}
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {items.length} {type === 'divisions' ? 'divisions' : 'people'} found
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  {items.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Compact items list - checkbox + name + X button */}
              <div className="space-y-1">
                {type === 'divisions'
                  ? divisions.map((division) => (
                      <div
                        key={division.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                          division.selected ? 'bg-green-50' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={division.selected}
                            onChange={() => handleToggleItem(division.id)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: 'var(--scout-trail)' }}
                          />
                          <span
                            className="text-sm font-medium"
                            style={{ color: division.selected ? 'var(--scout-saddle)' : 'var(--scout-earth-light)' }}
                          >
                            {division.name}
                          </span>
                        </label>
                        <button
                          onClick={() => handleRemoveItem(division.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  : stakeholders.map((person) => (
                      <div
                        key={person.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                          person.selected ? 'bg-green-50' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={person.selected}
                            onChange={() => handleToggleItem(person.id)}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: 'var(--scout-trail)' }}
                          />
                          <div>
                            <span
                              className="text-sm font-medium"
                              style={{ color: person.selected ? 'var(--scout-saddle)' : 'var(--scout-earth-light)' }}
                            >
                              {person.name}
                            </span>
                            {person.title && (
                              <span className="text-xs ml-2" style={{ color: 'var(--scout-earth-light)' }}>
                                {person.title}
                              </span>
                            )}
                          </div>
                        </label>
                        <button
                          onClick={() => handleRemoveItem(person.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasSearched && items.length > 0 && (
          <div
            className="px-6 py-4 border-t flex justify-between"
            style={{ borderColor: 'var(--scout-border)' }}
          >
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              Research Again
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedCount === 0}
              className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {isSaving ? 'Saving...' : `Accept ${selectedCount} Selected`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
