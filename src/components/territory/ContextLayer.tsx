'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TerrainContextCard } from './TerrainContextCard'
import { CompassContextCard } from './CompassContextCard'

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
  account_plan_id?: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  linkedin_url?: string
  role_type?: string
  sentiment?: string
  business_unit?: string
  department?: string
  division_id?: string
  is_placeholder?: boolean
  placeholder_role?: string
  notes?: string
  profile_notes?: string
  relationship_strength?: string
  purchasing_authority?: string
  power_level?: string
  interest_level?: string
}

interface ProductUsage {
  usage_id: string
  account_plan_id: string
  division_id: string | null
  product_module: string
  usage_status: string | null
  notes?: string
}

interface ContextLayerProps {
  accountId: string
  divisions: Division[]
  stakeholders: Stakeholder[]
  productUsage: ProductUsage[]
  onDivisionUpdate: () => void
  onStakeholderUpdate: () => void
}

export function ContextLayer({
  accountId,
  divisions,
  stakeholders,
  productUsage,
  onDivisionUpdate,
  onStakeholderUpdate,
}: ContextLayerProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div
      className="rounded-xl border overflow-hidden mt-4"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        style={{ backgroundColor: 'var(--scout-parchment)' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🗺️</span>
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--scout-saddle)' }}
          >
            Context Layer
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
          >
            {divisions.length} divisions
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
          >
            {stakeholders.filter(s => !s.is_placeholder).length} contacts
          </span>
        </div>
        <button className="p-1 rounded hover:bg-gray-100">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'var(--scout-earth-light)' }} />
          )}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TerrainContextCard
            accountId={accountId}
            divisions={divisions}
            stakeholders={stakeholders}
            productUsage={productUsage}
            onUpdate={onDivisionUpdate}
          />
          <CompassContextCard
            accountId={accountId}
            stakeholders={stakeholders}
            divisions={divisions}
            onUpdate={onStakeholderUpdate}
          />
        </div>
      )}
    </div>
  )
}
