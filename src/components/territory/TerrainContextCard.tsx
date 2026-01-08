'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Map, Users } from 'lucide-react'
import { DivisionDrawer } from '@/components/drawers/DivisionDrawer'

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
}

interface ProductUsage {
  usage_id: string
  division_id: string | null
  product_module: string
  usage_status: string | null
}

interface TerrainContextCardProps {
  accountId: string
  divisions: Division[]
  stakeholders: Stakeholder[]
  productUsage: ProductUsage[]
  onUpdate: () => void
}

const DIVISION_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  division: { label: 'Division', color: 'var(--scout-trail)' },
  business_unit: { label: 'BU', color: 'var(--scout-sky)' },
  subsidiary: { label: 'Subsidiary', color: 'var(--scout-sunset)' },
  region: { label: 'Region', color: 'var(--scout-earth)' },
  product_line: { label: 'Product', color: 'var(--scout-clay)' },
}

export function TerrainContextCard({
  accountId,
  divisions,
  stakeholders,
  productUsage,
  onUpdate,
}: TerrainContextCardProps) {
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [hoveredDivision, setHoveredDivision] = useState<string | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Build hierarchy tree (3 levels max)
  const buildTree = () => {
    const rootDivisions = divisions.filter(d => !d.parent_division_id)
    const level2Map: Record<string, Division[]> = {}
    const level3Map: Record<string, Division[]> = {}

    divisions.forEach(d => {
      if (d.parent_division_id) {
        const parent = divisions.find(p => p.division_id === d.parent_division_id)
        if (parent) {
          // Check if parent is a root (level 1) -> this is level 2
          if (!parent.parent_division_id) {
            const existing = level2Map[parent.division_id] || []
            level2Map[parent.division_id] = [...existing, d]
          } else {
            // Parent is level 2 -> this is level 3
            const existing = level3Map[parent.division_id] || []
            level3Map[parent.division_id] = [...existing, d]
          }
        }
      }
    })

    return { rootDivisions, level2Map, level3Map }
  }

  const { rootDivisions, level2Map, level3Map } = buildTree()

  // Get stakeholder count for a division
  const getStakeholderCount = (divisionId: string) => {
    return stakeholders.filter(s => s.division_id === divisionId).length
  }

  // Get products for a division
  const getDivisionProducts = (divisionId: string) => {
    return productUsage
      .filter(p => p.division_id === divisionId && p.usage_status === 'used')
      .map(p => p.product_module)
  }

  // Get stakeholders for a division
  const getDivisionStakeholders = (divisionId: string) => {
    return stakeholders.filter(s => s.division_id === divisionId)
  }

  const handleDivisionClick = (division: Division) => {
    setSelectedDivision(division)
    setIsAddingNew(false)
    setIsDrawerOpen(true)
  }

  const handleAddDivision = () => {
    setSelectedDivision(null)
    setIsAddingNew(true)
    setIsDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setIsDrawerOpen(false)
    setSelectedDivision(null)
    setIsAddingNew(false)
  }

  const handleDrawerSave = () => {
    onUpdate()
    handleDrawerClose()
  }

  const renderDivisionCard = (division: Division, level: number) => {
    const typeConfig = DIVISION_TYPE_BADGES[division.division_type || 'division']
    const stakeholderCount = getStakeholderCount(division.division_id)
    const products = getDivisionProducts(division.division_id)
    const divisionStakeholders = getDivisionStakeholders(division.division_id)
    const isHovered = hoveredDivision === division.division_id

    return (
      <div
        key={division.division_id}
        className="relative"
        style={{ marginLeft: level * 20 }}
      >
        {/* Connecting line for nested items */}
        {level > 0 && (
          <div
            className="absolute left-[-12px] top-0 bottom-1/2 w-[12px] border-l-2 border-b-2 rounded-bl"
            style={{ borderColor: 'var(--scout-border)' }}
          />
        )}

        <div
          className="relative p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
          style={{
            borderColor: isHovered ? 'var(--scout-saddle)' : 'var(--scout-border)',
            backgroundColor: isHovered ? 'var(--scout-parchment)' : 'transparent',
          }}
          onClick={() => handleDivisionClick(division)}
          onMouseEnter={() => setHoveredDivision(division.division_id)}
          onMouseLeave={() => setHoveredDivision(null)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🏢</span>
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--scout-saddle)' }}
              >
                {division.name}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: `${typeConfig.color}20`,
                  color: typeConfig.color,
                }}
              >
                {typeConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              <Users className="w-3 h-3" />
              <span>{stakeholderCount}</span>
            </div>
          </div>

          {/* Popover on hover */}
          {isHovered && (
            <div
              className="absolute z-50 left-full ml-2 top-0 w-64 p-3 rounded-lg border shadow-lg"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
                {division.name}
              </div>

              {division.description && (
                <p className="text-xs mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                  {division.description}
                </p>
              )}

              {products.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                    Products
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {products.map(p => (
                      <span
                        key={p}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {divisionStakeholders.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                    Key Contacts
                  </div>
                  <div className="space-y-1">
                    {divisionStakeholders.slice(0, 3).map(s => (
                      <div key={s.stakeholder_id} className="text-xs" style={{ color: 'var(--scout-earth)' }}>
                        {s.full_name} {s.title && `- ${s.title}`}
                      </div>
                    ))}
                    {divisionStakeholders.length > 3 && (
                      <div className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                        +{divisionStakeholders.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                className="text-xs font-medium mt-1"
                style={{ color: 'var(--scout-sky)' }}
                onClick={() => handleDivisionClick(division)}
              >
                Edit Division →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4" style={{ color: 'var(--scout-trail)' }} />
          <h4 className="text-sm font-semibold" style={{ color: 'var(--scout-saddle)' }}>
            Terrain
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/territory/${accountId}/whitespace`}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 transition-colors flex items-center gap-1"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          >
            <span>📊</span>
            <span>White Space</span>
          </Link>
          <button
            onClick={handleAddDivision}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-50 transition-colors flex items-center gap-1"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-trail)' }}
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Division Tree */}
      {divisions.length === 0 ? (
        <div
          className="text-center py-6 text-sm"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          <Map className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No divisions mapped yet</p>
          <button
            onClick={handleAddDivision}
            className="mt-2 text-xs font-medium"
            style={{ color: 'var(--scout-sky)' }}
          >
            + Add first division
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rootDivisions.map(rootDiv => (
            <div key={rootDiv.division_id}>
              {renderDivisionCard(rootDiv, 0)}
              {/* Level 2 children */}
              {level2Map[rootDiv.division_id]?.map(l2Div => (
                <div key={l2Div.division_id} className="mt-1">
                  {renderDivisionCard(l2Div, 1)}
                  {/* Level 3 children */}
                  {level3Map[l2Div.division_id]?.map(l3Div => (
                    <div key={l3Div.division_id} className="mt-1">
                      {renderDivisionCard(l3Div, 2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Division Drawer */}
      <DivisionDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
        accountPlanId={accountId}
        division={selectedDivision}
        allDivisions={divisions}
        stakeholders={stakeholders}
        mode={isAddingNew ? 'create' : 'edit'}
      />
    </div>
  )
}
