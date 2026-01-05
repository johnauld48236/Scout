'use client'

import { useState, useEffect } from 'react'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { Account, BusinessUnit, ResearchFinding } from './PlanningContainer'

// Default Corporate unit - always included for central functions (purchasing, legal, etc.)
const CORPORATE_UNIT: BusinessUnit = {
  id: 'unit-corporate',
  name: 'Corporate',
  description: 'Central functions including purchasing, legal, IT, finance, and executive leadership',
}

interface OrgSignalMappingProps {
  account: Account
  updateAccount: (updates: Partial<Account>) => void
  onNext: () => void
}

export function OrgSignalMapping({ account, updateAccount, onNext }: OrgSignalMappingProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [editingUnit, setEditingUnit] = useState<string | null>(null)

  const businessUnits = account.business_units || []

  // Ensure Corporate unit always exists
  useEffect(() => {
    const hasCorporate = businessUnits.some(u => u.id === 'unit-corporate')
    if (!hasCorporate && businessUnits.length === 0) {
      // Add Corporate as the initial unit when starting fresh
      updateAccount({ business_units: [CORPORATE_UNIT] })
    } else if (!hasCorporate && businessUnits.length > 0) {
      // Add Corporate if it's missing from existing units
      updateAccount({ business_units: [CORPORATE_UNIT, ...businessUnits] })
    }
  }, []) // Only run once on mount

  const signalMappings = account.signal_mappings || {}
  // Research findings from wizard are already filtered (accepted/edited only)
  // Generate IDs for legacy data that may not have them
  const researchFindings = (account.research_findings || []).map((f, index) => ({
    ...f,
    id: f.id || `finding-${index}`,
  }))

  // Generate business units with AI
  const generateBusinessUnits = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze ${account.account_name} and identify their main business units or divisions.

Company Info:
- Industry: ${account.industry || 'Unknown'}
- Size: ${account.employee_count || 'Unknown'}
- Description: ${account.description || 'N/A'}

Research findings:
${researchFindings.map(f => `- ${f.content}`).join('\n')}

List 3-6 main business units/divisions. For each, provide:
BusinessUnit: [Name]
Description: [Brief description of what this unit does]
Products: [Key products or services, if known]

Focus on units that would be relevant for a B2B sales engagement.`,
          context: { navigation: { page: 'accounts' } },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content
        const units: BusinessUnit[] = []

        const blocks = content.split(/(?=BusinessUnit:|^\d+\.)/m).filter((b: string) => b.trim())

        blocks.forEach((block: string, i: number) => {
          const nameMatch = block.match(/(?:BusinessUnit:|^\d+\.?\s*)([^\n]+)/i)
          const descMatch = block.match(/Description:\s*([^\n]+)/i)
          const productsMatch = block.match(/Products?:\s*([^\n]+)/i)

          if (nameMatch) {
            const name = nameMatch[1].replace(/^[-*\d.)\s]+/, '').trim()
            if (name.length > 2) {
              units.push({
                id: `unit-${Date.now()}-${i}`,
                name,
                description: descMatch?.[1]?.trim(),
                products: productsMatch?.[1]?.split(',').map(p => p.trim()),
              })
            }
          }
        })

        // Always include Corporate unit at the beginning
        const finalUnits = [CORPORATE_UNIT, ...units.filter(u => u.name.toLowerCase() !== 'corporate')]
        updateAccount({ business_units: finalUnits })
      }
    } catch (error) {
      console.error('Failed to generate business units:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const addBusinessUnit = () => {
    if (!newUnitName.trim()) return
    const newUnit: BusinessUnit = {
      id: `unit-${Date.now()}`,
      name: newUnitName.trim(),
    }
    updateAccount({ business_units: [...businessUnits, newUnit] })
    setNewUnitName('')
  }

  const removeBusinessUnit = (unitId: string) => {
    // Prevent removing the Corporate unit
    if (unitId === 'unit-corporate') return

    updateAccount({
      business_units: businessUnits.filter(u => u.id !== unitId),
      signal_mappings: Object.fromEntries(
        Object.entries(signalMappings).filter(([, value]) => value !== unitId)
      ),
    })
  }

  const updateBusinessUnit = (unitId: string, updates: Partial<BusinessUnit>) => {
    updateAccount({
      business_units: businessUnits.map(u =>
        u.id === unitId ? { ...u, ...updates } : u
      ),
    })
    setEditingUnit(null)
  }

  const mapSignalToUnit = (findingId: string, unitId: string | null) => {
    const newMappings = { ...signalMappings }
    if (unitId) {
      newMappings[findingId] = unitId
    } else {
      delete newMappings[findingId]
    }
    updateAccount({ signal_mappings: newMappings })
  }

  const unmappedSignals = researchFindings.filter(f => !signalMappings[f.id])
  const mappedSignalsCount = researchFindings.length - unmappedSignals.length

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-semibold mb-1"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Org Structure & Signal Mapping
        </h2>
        <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          Map {account.account_name}&apos;s business units and connect your research signals to them.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Units Panel */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--scout-earth)' }}>
              Business Units
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}>
              {businessUnits.length} units
            </span>
          </div>

          {/* AI Generate Button */}
          {businessUnits.length === 0 && (
            <button
              onClick={generateBusinessUnits}
              disabled={isGenerating}
              className="w-full mb-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
              style={{
                background: isGenerating
                  ? 'var(--scout-earth-light)'
                  : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
              }}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Scout AI analyzing org structure...</span>
                </>
              ) : (
                <>
                  <ScoutAIIcon size={22} className="text-white" />
                  <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                    Scout AI: Identify Business Units
                  </span>
                </>
              )}
            </button>
          )}

          {/* Business Units List */}
          <div className="space-y-2 mb-4">
            {businessUnits.map(unit => (
              <div
                key={unit.id}
                className="p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                {editingUnit === unit.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={unit.name}
                      onChange={(e) => updateBusinessUnit(unit.id, { name: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                    <input
                      type="text"
                      value={unit.description || ''}
                      onChange={(e) => updateBusinessUnit(unit.id, { description: e.target.value })}
                      placeholder="Description..."
                      className="w-full border rounded px-2 py-1 text-sm"
                      style={{ borderColor: 'var(--scout-border)' }}
                    />
                    <button
                      onClick={() => setEditingUnit(null)}
                      className="text-xs"
                      style={{ color: 'var(--scout-sky)' }}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--scout-earth)' }}>
                        {unit.name}
                      </p>
                      {unit.description && (
                        <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                          {unit.description}
                        </p>
                      )}
                      {unit.products && unit.products.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {unit.products.map((product, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Show mapped signals count */}
                      {Object.values(signalMappings).filter(v => v === unit.id).length > 0 && (
                        <p className="text-xs mt-2" style={{ color: 'var(--scout-trail)' }}>
                          {Object.values(signalMappings).filter(v => v === unit.id).length} signals mapped
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUnit(unit.id)}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--scout-sky)' }}
                      >
                        Edit
                      </button>
                      {unit.id !== 'unit-corporate' && (
                        <button
                          onClick={() => removeBusinessUnit(unit.id)}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--scout-clay)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Unit Form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBusinessUnit()}
              placeholder="Add business unit..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            />
            <button
              onClick={addBusinessUnit}
              disabled={!newUnitName.trim()}
              className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Add
            </button>
          </div>

          {businessUnits.length > 0 && (
            <button
              onClick={generateBusinessUnits}
              disabled={isGenerating}
              className="mt-3 text-sm hover:underline"
              style={{ color: 'var(--scout-sky)' }}
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate with Scout AI'}
            </button>
          )}
        </div>

        {/* Signals Panel */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--scout-earth)' }}>
              Research Signals
            </h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: mappedSignalsCount === researchFindings.length
                  ? 'rgba(93, 122, 93, 0.15)'
                  : 'var(--scout-border)',
                color: mappedSignalsCount === researchFindings.length
                  ? 'var(--scout-trail)'
                  : 'var(--scout-earth-light)',
              }}
            >
              {mappedSignalsCount}/{researchFindings.length} mapped
            </span>
          </div>

          {researchFindings.length === 0 ? (
            <div
              className="p-4 rounded-lg border border-dashed text-center"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                No research signals available. Complete the research step in the wizard first.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {researchFindings.map(finding => {
                const mappedUnitId = signalMappings[finding.id]
                const mappedUnit = businessUnits.find(u => u.id === mappedUnitId)

                return (
                  <div
                    key={finding.id}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: mappedUnit ? 'rgba(93, 122, 93, 0.05)' : 'white',
                      borderColor: mappedUnit ? 'rgba(93, 122, 93, 0.3)' : 'var(--scout-border)',
                    }}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          backgroundColor: getCategoryColor(finding.category).bg,
                          color: getCategoryColor(finding.category).text,
                        }}
                      >
                        {finding.category}
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--scout-earth)' }}>
                      {finding.editedContent || finding.content}
                    </p>
                    <select
                      value={mappedUnitId || ''}
                      onChange={(e) => mapSignalToUnit(finding.id, e.target.value || null)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                    >
                      <option value="">— Select business unit —</option>
                      {businessUnits.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 pt-4 flex justify-end border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          Continue to Stakeholders →
        </button>
      </div>
    </div>
  )
}

function getCategoryColor(category: string) {
  switch (category?.toLowerCase()) {
    case 'news':
    case 'recent news':
      return { bg: 'rgba(74, 144, 164, 0.15)', text: 'var(--scout-sky)' }
    case 'leadership':
    case 'people':
      return { bg: 'rgba(139, 69, 19, 0.15)', text: 'var(--scout-saddle)' }
    case 'technology':
    case 'tech':
      return { bg: 'rgba(93, 122, 93, 0.15)', text: 'var(--scout-trail)' }
    case 'financial':
    case 'financials':
      return { bg: 'rgba(210, 105, 30, 0.15)', text: 'var(--scout-sunset)' }
    case 'challenges':
    case 'risks':
      return { bg: 'rgba(169, 68, 66, 0.15)', text: 'var(--scout-clay)' }
    default:
      return { bg: 'var(--scout-border)', text: 'var(--scout-earth)' }
  }
}
