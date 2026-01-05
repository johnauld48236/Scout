'use client'

import { useState } from 'react'

interface BusinessUnit {
  id: string
  name: string
  description?: string
  parent_id?: string
  products?: string[]
}

interface Pursuit {
  pursuit_id: string
  name: string
  business_unit_id?: string
  stage?: string
  estimated_value?: number | string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  business_unit?: string
  relationship_strength?: string
  role_type?: string
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

interface OrgChartCardProps {
  businessUnits: BusinessUnit[]
  pursuits: Pursuit[]
  stakeholders: Stakeholder[]
  corporateStructure?: CorporateStructure | null
}

interface DivisionData {
  unit: BusinessUnit
  opportunities: Pursuit[]
  contacts: Stakeholder[]
  health: 'strong' | 'developing' | 'weak' | 'none'
}

export function OrgChartCard({ businessUnits, pursuits, stakeholders, corporateStructure }: OrgChartCardProps) {
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showStructure, setShowStructure] = useState(true)

  // Show component if we have business units OR corporate structure
  const hasBusinessUnits = businessUnits && businessUnits.length > 0
  const hasStructure = corporateStructure && Object.keys(corporateStructure).length > 0

  if (!hasBusinessUnits && !hasStructure) {
    return null
  }

  // Calculate data for each business unit
  const divisionData: DivisionData[] = businessUnits.map(unit => {
    // Find opportunities linked to this unit
    const opportunities = pursuits.filter(p => p.business_unit_id === unit.id)

    // Find stakeholders in this unit (match by name since business_unit is a string)
    const contacts = stakeholders.filter(s =>
      s.business_unit?.toLowerCase() === unit.name.toLowerCase() ||
      s.business_unit === unit.id
    )

    // Calculate health based on coverage
    let health: 'strong' | 'developing' | 'weak' | 'none' = 'none'
    const hasActiveOpp = opportunities.some(o =>
      o.stage && !['Closed Won', 'Closed_Won', 'Closed Lost', 'Closed_Lost'].includes(o.stage)
    )
    const hasChampion = contacts.some(c => c.role_type === 'Champion')
    const hasStrongRelationship = contacts.some(c =>
      c.relationship_strength === 'Strong' || c.relationship_strength === 'strong'
    )

    if (hasActiveOpp && (hasChampion || hasStrongRelationship) && contacts.length >= 2) {
      health = 'strong'
    } else if (hasActiveOpp || contacts.length >= 2) {
      health = 'developing'
    } else if (contacts.length > 0) {
      health = 'weak'
    }

    return { unit, opportunities, contacts, health }
  })

  // Sort: units with coverage first, then by name
  const sortedData = [...divisionData].sort((a, b) => {
    const aScore = (a.opportunities.length * 2) + a.contacts.length
    const bScore = (b.opportunities.length * 2) + b.contacts.length
    if (aScore !== bScore) return bScore - aScore
    return a.unit.name.localeCompare(b.unit.name)
  })

  const totalCoverage = sortedData.filter(d => d.health !== 'none').length
  const totalUnits = sortedData.length

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
            Organization Coverage
          </h3>
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: totalCoverage > 0 ? 'rgba(93, 122, 93, 0.15)' : 'var(--scout-border)',
              color: totalCoverage > 0 ? 'var(--scout-trail)' : 'var(--scout-earth-light)'
            }}
          >
            {totalCoverage}/{totalUnits}
          </span>
        </div>
        {isCollapsed && (
          <div className="flex items-center gap-1">
            {sortedData.slice(0, 4).map(d => (
              <HealthDot key={d.unit.id} health={d.health} size="sm" />
            ))}
            {sortedData.length > 4 && (
              <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                +{sortedData.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Corporate Structure Section */}
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

          {/* Business Units Coverage */}
          {hasBusinessUnits && (
            <>
              {hasStructure && (
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                  Division Coverage
                </p>
              )}
              <div className="space-y-2">
                {sortedData.map(({ unit, opportunities, contacts, health }) => (
            <div
              key={unit.id}
              className="relative"
              onMouseEnter={() => setHoveredUnit(unit.id)}
              onMouseLeave={() => setHoveredUnit(null)}
            >
              <div
                className="flex items-center justify-between p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: hoveredUnit === unit.id ? 'var(--scout-parchment)' : 'transparent'
                }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <HealthDot health={health} />
                  <span
                    className="text-sm truncate"
                    style={{ color: health === 'none' ? 'var(--scout-earth-light)' : 'var(--scout-earth)' }}
                  >
                    {unit.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0">
                  {/* Opportunities indicator */}
                  {opportunities.length > 0 && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: 'var(--scout-sky)' }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      {opportunities.length}
                    </span>
                  )}

                  {/* Contacts indicator */}
                  {contacts.length > 0 && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: 'var(--scout-trail)' }}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {contacts.length}
                    </span>
                  )}

                  {/* No coverage indicator */}
                  {opportunities.length === 0 && contacts.length === 0 && (
                    <span style={{ color: 'var(--scout-earth-light)' }}>
                      No coverage
                    </span>
                  )}
                </div>
              </div>

              {/* Hover details tooltip */}
              {hoveredUnit === unit.id && (opportunities.length > 0 || contacts.length > 0) && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 p-3 rounded-lg shadow-lg border z-10"
                  style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                >
                  {opportunities.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-sky)' }}>
                        Opportunities ({opportunities.length})
                      </p>
                      <div className="space-y-1">
                        {opportunities.slice(0, 3).map(opp => (
                          <div key={opp.pursuit_id} className="flex items-center justify-between text-xs">
                            <span className="truncate" style={{ color: 'var(--scout-earth)' }}>
                              {opp.name}
                            </span>
                            <span
                              className="shrink-0 ml-2 px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
                            >
                              {opp.stage || 'Unknown'}
                            </span>
                          </div>
                        ))}
                        {opportunities.length > 3 && (
                          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                            +{opportunities.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {contacts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-trail)' }}>
                        Contacts ({contacts.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {contacts.slice(0, 4).map(contact => (
                          <span
                            key={contact.stakeholder_id}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                          >
                            {contact.full_name}
                          </span>
                        ))}
                        {contacts.length > 4 && (
                          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                            +{contacts.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function HealthDot({ health, size = 'md' }: { health: 'strong' | 'developing' | 'weak' | 'none'; size?: 'sm' | 'md' }) {
  const colors = {
    strong: 'var(--scout-trail)',
    developing: 'var(--scout-sunset)',
    weak: 'var(--scout-clay)',
    none: 'var(--scout-border)',
  }

  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'

  return (
    <span
      className={`${sizeClasses} rounded-full shrink-0`}
      style={{ backgroundColor: colors[health] }}
      title={health === 'none' ? 'No coverage' : `${health.charAt(0).toUpperCase() + health.slice(1)} coverage`}
    />
  )
}
