'use client'

import { useState, useCallback } from 'react'
import { DivisionDrawer } from '@/components/drawers/DivisionDrawer'
import { QuickAIResearchButton } from './QuickAIResearchButton'

interface Division {
  division_id: string
  account_plan_id: string
  name: string
  description?: string
  division_type?: string
  products?: string[]
  parent_division_id?: string
  headcount?: number
  revenue_estimate?: string
  key_focus_areas?: string[]
  sort_order?: number
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
  division_id?: string
  role_type?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
  business_unit_id?: string
  stage?: string
}

interface CorporateStructure {
  headquarters?: string
  parent_company?: string
  ownership_type?: 'public' | 'private' | 'subsidiary'
  stock_symbol?: string
  employee_count?: number
  annual_revenue?: string
  founded_year?: number
  ceo?: string
  subsidiaries?: string[]
}

interface DivisionsCardProps {
  accountPlanId: string
  divisions: Division[]
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  corporateStructure?: CorporateStructure | null
  // For AI research
  accountName?: string
  website?: string | null
  industry?: string | null
  campaignContext?: string | null
  companyContext?: string | null
}

export function DivisionsCard({
  accountPlanId,
  divisions: initialDivisions,
  stakeholders,
  pursuits,
  corporateStructure,
  accountName,
  website,
  industry,
  campaignContext,
  companyContext,
}: DivisionsCardProps) {
  const [divisions, setDivisions] = useState(initialDivisions)
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showStructure, setShowStructure] = useState(true)

  const hasStructure = corporateStructure && Object.keys(corporateStructure).length > 0

  const handleDivisionClick = useCallback((division: Division) => {
    setSelectedDivision(division)
    setDrawerMode('edit')
    setDrawerOpen(true)
  }, [])

  const handleAddDivision = useCallback(() => {
    setSelectedDivision(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }, [])

  const handleDivisionSave = useCallback((updated: Division) => {
    setDivisions(prev => {
      const exists = prev.some(d => d.division_id === updated.division_id)
      if (exists) {
        return prev.map(d => d.division_id === updated.division_id ? updated : d)
      }
      return [...prev, updated]
    })
  }, [])

  const handleDivisionDelete = useCallback((id: string) => {
    setDivisions(prev => prev.filter(d => d.division_id !== id))
  }, [])

  // Calculate coverage for each division
  const divisionData = divisions.map(div => {
    const divStakeholders = stakeholders.filter(s => s.division_id === div.division_id)
    const divPursuits = pursuits.filter(p => p.business_unit_id === div.division_id)
    return {
      division: div,
      stakeholderCount: divStakeholders.length,
      pursuitCount: divPursuits.length,
    }
  })

  const coveredDivisions = divisionData.filter(d => d.stakeholderCount > 0 || d.pursuitCount > 0).length

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            style={{ color: 'var(--scout-earth-light)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h3
            className="font-semibold text-sm"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Corporate Structure
          </h3>
          {divisions.length > 0 && (
            <span
              className="px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: coveredDivisions > 0 ? 'rgba(93, 122, 93, 0.15)' : 'var(--scout-border)',
                color: coveredDivisions > 0 ? 'var(--scout-trail)' : 'var(--scout-earth-light)'
              }}
            >
              {coveredDivisions}/{divisions.length} covered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {accountName && (
            <QuickAIResearchButton
              accountId={accountPlanId}
              accountName={accountName}
              website={website}
              industry={industry}
              campaignContext={campaignContext}
              companyContext={companyContext}
              mode="structure"
              divisions={divisions}
            />
          )}
          <button
            onClick={handleAddDivision}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-100 transition-colors"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Corporate Profile Section */}
          {hasStructure && (
            <div className="mb-4">
              <button
                onClick={() => setShowStructure(!showStructure)}
                className="flex items-center gap-2 text-xs font-medium mb-2"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showStructure ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Corporate Profile
              </button>

              {showStructure && (
                <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'var(--scout-parchment)' }}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {corporateStructure?.parent_company && (
                      <div className="col-span-2">
                        <span style={{ color: 'var(--scout-earth-light)' }}>Parent Company: </span>
                        <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                          {corporateStructure.parent_company}
                        </span>
                      </div>
                    )}
                    {corporateStructure?.ownership_type && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Type: </span>
                        <span
                          className="capitalize px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: corporateStructure.ownership_type === 'public'
                              ? 'rgba(56, 152, 199, 0.15)'
                              : corporateStructure.ownership_type === 'subsidiary'
                              ? 'rgba(210, 105, 30, 0.15)'
                              : 'rgba(93, 122, 93, 0.15)',
                            color: corporateStructure.ownership_type === 'public'
                              ? 'var(--scout-sky)'
                              : corporateStructure.ownership_type === 'subsidiary'
                              ? 'var(--scout-sunset)'
                              : 'var(--scout-trail)'
                          }}
                        >
                          {corporateStructure.ownership_type}
                        </span>
                        {corporateStructure.stock_symbol && (
                          <span className="ml-1" style={{ color: 'var(--scout-sky)' }}>
                            ({corporateStructure.stock_symbol})
                          </span>
                        )}
                      </div>
                    )}
                    {corporateStructure?.headquarters && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>HQ: </span>
                        <span style={{ color: 'var(--scout-earth)' }}>{corporateStructure.headquarters}</span>
                      </div>
                    )}
                    {corporateStructure?.employee_count && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Employees: </span>
                        <span style={{ color: 'var(--scout-earth)' }}>
                          {corporateStructure.employee_count.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {corporateStructure?.annual_revenue && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Revenue: </span>
                        <span style={{ color: 'var(--scout-earth)' }}>{corporateStructure.annual_revenue}</span>
                      </div>
                    )}
                    {corporateStructure?.ceo && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>CEO: </span>
                        <span style={{ color: 'var(--scout-earth)' }}>{corporateStructure.ceo}</span>
                      </div>
                    )}
                    {corporateStructure?.founded_year && (
                      <div>
                        <span style={{ color: 'var(--scout-earth-light)' }}>Founded: </span>
                        <span style={{ color: 'var(--scout-earth)' }}>{corporateStructure.founded_year}</span>
                      </div>
                    )}
                    {corporateStructure?.subsidiaries && corporateStructure.subsidiaries.length > 0 && (
                      <div className="col-span-2 mt-1">
                        <span style={{ color: 'var(--scout-earth-light)' }}>Subsidiaries: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {corporateStructure.subsidiaries.map((sub, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{ backgroundColor: 'rgba(210, 105, 30, 0.1)', color: 'var(--scout-sunset)' }}
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divisions Section Label */}
          {hasStructure && divisions.length > 0 && (
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Division Coverage
            </p>
          )}

          {divisions.length > 0 ? (
            <div className="space-y-2">
              {divisionData.map(({ division, stakeholderCount, pursuitCount }) => (
                <div
                  key={division.division_id}
                  onClick={() => handleDivisionClick(division)}
                  className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm hover:border-amber-300"
                  style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
                          {division.name}
                        </span>
                        {division.division_type && division.division_type !== 'division' && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
                          >
                            {division.division_type}
                          </span>
                        )}
                      </div>
                      {division.description && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--scout-earth-light)' }}>
                          {division.description}
                        </p>
                      )}
                      {division.products && division.products.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {division.products.slice(0, 3).map((product, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(74, 144, 164, 0.1)', color: 'var(--scout-sky)' }}
                            >
                              {product}
                            </span>
                          ))}
                          {division.products.length > 3 && (
                            <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                              +{division.products.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Coverage indicators */}
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {stakeholderCount > 0 && (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--scout-trail)' }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {stakeholderCount}
                        </span>
                      )}
                      {pursuitCount > 0 && (
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: 'var(--scout-sky)' }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          {pursuitCount}
                        </span>
                      )}
                      {stakeholderCount === 0 && pursuitCount === 0 && (
                        <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                          No coverage
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="p-4 rounded-lg border border-dashed text-center"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                No divisions mapped yet.
              </p>
              <button
                onClick={handleAddDivision}
                className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
              >
                Add division structure
              </button>
            </div>
          )}
        </div>
      )}

      {/* Division Drawer */}
      <DivisionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        division={selectedDivision}
        accountPlanId={accountPlanId}
        allDivisions={divisions}
        stakeholders={stakeholders}
        onSave={handleDivisionSave}
        onDelete={handleDivisionDelete}
        mode={drawerMode}
      />
    </div>
  )
}
