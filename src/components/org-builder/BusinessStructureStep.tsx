'use client'

import { useState } from 'react'
import { BusinessUnit } from './OrgBuilderWizard'

interface Account {
  account_name: string
  industry?: string
  research_findings?: Array<{
    category: string
    finding: string
  }>
}

interface BusinessStructureStepProps {
  account: Account
  businessUnits: BusinessUnit[]
  onUpdateUnits: (units: BusinessUnit[]) => void
}

export function BusinessStructureStep({
  account,
  businessUnits,
  onUpdateUnits,
}: BusinessStructureStepProps) {
  const [newUnitName, setNewUnitName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return

    const newUnit: BusinessUnit = {
      id: `unit-${Date.now()}`,
      name: newUnitName.trim(),
      level: 0,
    }

    onUpdateUnits([...businessUnits, newUnit])
    setNewUnitName('')
  }

  const handleRemoveUnit = (id: string) => {
    onUpdateUnits(businessUnits.filter(u => u.id !== id))
  }

  const handleEditStart = (unit: BusinessUnit) => {
    setEditingId(unit.id)
    setEditingName(unit.name)
  }

  const handleEditSave = () => {
    if (!editingId || !editingName.trim()) return

    onUpdateUnits(
      businessUnits.map(u =>
        u.id === editingId ? { ...u, name: editingName.trim() } : u
      )
    )
    setEditingId(null)
    setEditingName('')
  }

  const handleAISuggest = async () => {
    setIsLoadingAI(true)
    try {
      const response = await fetch('/api/ai/org-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: account.account_name,
          industry: account.industry,
          researchFindings: account.research_findings,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.units && result.units.length > 0) {
          const newUnits = result.units.map((name: string, i: number) => ({
            id: `ai-unit-${Date.now()}-${i}`,
            name,
            level: 0,
          }))
          onUpdateUnits([...businessUnits, ...newUnits])
        }
      }
    } catch (error) {
      console.error('AI suggestion failed:', error)
    } finally {
      setIsLoadingAI(false)
    }
  }

  // Common business unit suggestions based on industry
  const getIndustrySuggestions = (): string[] => {
    const industry = account.industry?.toLowerCase() || ''

    if (industry.includes('medical') || industry.includes('health')) {
      return ['Cardiovascular', 'Diabetes', 'Surgical', 'Neuroscience', 'Corporate']
    }
    if (industry.includes('tech') || industry.includes('software')) {
      return ['Engineering', 'Product', 'Sales', 'Marketing', 'Operations']
    }
    if (industry.includes('manufacturing')) {
      return ['Production', 'Engineering', 'Quality', 'Supply Chain', 'R&D']
    }
    if (industry.includes('finance') || industry.includes('bank')) {
      return ['Retail Banking', 'Commercial', 'Wealth Management', 'Operations', 'Risk']
    }
    return ['Sales', 'Marketing', 'Engineering', 'Operations', 'Finance']
  }

  const suggestions = getIndustrySuggestions()
  const unusedSuggestions = suggestions.filter(
    s => !businessUnits.find(u => u.name.toLowerCase() === s.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Business Structure
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Define the key divisions and business units at {account.account_name}
          </p>
        </div>
        <button
          onClick={handleAISuggest}
          disabled={isLoadingAI}
          className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoadingAI ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Suggest
            </>
          )}
        </button>
      </div>

      {/* Quick add suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Quick add common units:</p>
          <div className="flex flex-wrap gap-2">
            {unusedSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => {
                  onUpdateUnits([
                    ...businessUnits,
                    { id: `unit-${Date.now()}`, name: suggestion, level: 0 },
                  ])
                }}
                className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current units */}
      <div className="space-y-2 mb-6">
        {businessUnits.map(unit => (
          <div
            key={unit.id}
            className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg group"
          >
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            {editingId === unit.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                  className="flex-1 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                  autoFocus
                />
                <button
                  onClick={handleEditSave}
                  className="text-green-600 hover:text-green-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {unit.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditStart(unit)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveUnit(unit.id)}
                    className="p-1 text-zinc-400 hover:text-red-600"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {businessUnits.length === 0 && (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            No business units defined yet. Add some above or use AI Suggest.
          </div>
        )}
      </div>

      {/* Add custom unit */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newUnitName}
          onChange={(e) => setNewUnitName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()}
          placeholder="Add custom business unit..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
        />
        <button
          onClick={handleAddUnit}
          disabled={!newUnitName.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}
