'use client'

import { useState, useEffect, useCallback } from 'react'
import { AccountDrawer, DrawerSection } from './AccountDrawer'

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

interface DivisionDrawerProps {
  isOpen: boolean
  onClose: () => void
  division: Division | null
  accountPlanId: string
  allDivisions: Division[]
  stakeholders: Stakeholder[]
  onSave?: (updatedDivision: Division) => void
  onDelete?: (divisionId: string) => void
  mode?: 'edit' | 'create'
}

const divisionTypes = [
  { value: 'division', label: 'Division', description: 'Major organizational division' },
  { value: 'business_unit', label: 'Business Unit', description: 'Standalone business unit' },
  { value: 'subsidiary', label: 'Subsidiary', description: 'Separate legal entity' },
  { value: 'region', label: 'Region', description: 'Geographic region' },
  { value: 'product_line', label: 'Product Line', description: 'Product-specific organization' },
]

export function DivisionDrawer({
  isOpen,
  onClose,
  division,
  accountPlanId,
  allDivisions,
  stakeholders,
  onSave,
  onDelete,
  mode = 'edit',
}: DivisionDrawerProps) {
  const [formData, setFormData] = useState<Partial<Division>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newProduct, setNewProduct] = useState('')
  const [newFocusArea, setNewFocusArea] = useState('')

  useEffect(() => {
    if (division) {
      setFormData({ ...division })
    } else {
      setFormData({
        division_type: 'division',
        products: [],
        key_focus_areas: [],
      })
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [division, isOpen])

  const handleChange = useCallback((field: keyof Division, value: string | number | string[] | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value === '' ? null : value,
    }))
  }, [])

  const addProduct = useCallback(() => {
    if (!newProduct.trim()) return
    setFormData(prev => ({
      ...prev,
      products: [...(prev.products || []), newProduct.trim()],
    }))
    setNewProduct('')
  }, [newProduct])

  const removeProduct = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      products: (prev.products || []).filter((_, i) => i !== index),
    }))
  }, [])

  const addFocusArea = useCallback(() => {
    if (!newFocusArea.trim()) return
    setFormData(prev => ({
      ...prev,
      key_focus_areas: [...(prev.key_focus_areas || []), newFocusArea.trim()],
    }))
    setNewFocusArea('')
  }, [newFocusArea])

  const removeFocusArea = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      key_focus_areas: (prev.key_focus_areas || []).filter((_, i) => i !== index),
    }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.name?.trim()) {
      setError('Division name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const isCreate = mode === 'create' || !division?.division_id

      const url = isCreate
        ? `/api/accounts/${accountPlanId}/divisions`
        : `/api/accounts/${accountPlanId}/divisions/${division!.division_id}`

      const response = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save')
      }

      onSave?.(result.division)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save division')
    } finally {
      setSaving(false)
    }
  }, [division, formData, accountPlanId, mode, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!division?.division_id) return

    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/divisions/${division.division_id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete division')
      }

      onDelete?.(division.division_id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }, [division, accountPlanId, onDelete, onClose])

  // Get stakeholders in this division
  const divisionStakeholders = stakeholders.filter(s => s.division_id === division?.division_id)

  // Get parent options (exclude self and children)
  const parentOptions = allDivisions.filter(d => d.division_id !== division?.division_id)

  const isCreate = mode === 'create' || !division?.division_id

  return (
    <AccountDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isCreate ? 'Add Division' : (formData.name || 'Division')}
      subtitle={formData.division_type ? divisionTypes.find(t => t.value === formData.division_type)?.label : undefined}
      width="lg"
      footer={
        <div className="flex items-center justify-between">
          {!isCreate ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-sm rounded-lg transition-colors"
              style={{ color: '#dc2626' }}
              disabled={saving}
            >
              Delete Division
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg text-white transition-colors"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {saving ? 'Saving...' : isCreate ? 'Create Division' : 'Save Changes'}
            </button>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mb-4 p-4 rounded-lg border-2 border-red-200 bg-red-50">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete &quot;{division?.name}&quot;?
            {divisionStakeholders.length > 0 && (
              <span className="block mt-1">
                {divisionStakeholders.length} stakeholder(s) will be unlinked from this division.
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm rounded border bg-white"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <DrawerSection title="Basic Information">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Division Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., Diagnostics Division"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border min-h-[80px]"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="What does this division do?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {divisionTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleChange('division_type', type.value)}
                  className={`p-2 text-left rounded-lg border transition-colors ${
                    formData.division_type === type.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{type.label}</span>
                  <span className="text-xs text-gray-500">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {parentOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
                Parent Division
              </label>
              <select
                value={formData.parent_division_id || ''}
                onChange={(e) => handleChange('parent_division_id', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="">No parent (top-level)</option>
                {parentOptions.map(d => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </DrawerSection>

      {/* Products */}
      <DrawerSection title="Products & Services">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addProduct())}
              className="flex-1 px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Add a product or service..."
            />
            <button
              onClick={addProduct}
              className="px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Add
            </button>
          </div>

          {(formData.products?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.products?.map((product, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full"
                  style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                >
                  {product}
                  <button
                    onClick={() => removeProduct(index)}
                    className="ml-1 hover:text-red-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {(formData.products?.length ?? 0) === 0 && (
            <p className="text-xs text-gray-400 italic">No products added yet</p>
          )}
        </div>
      </DrawerSection>

      {/* Key Focus Areas */}
      <DrawerSection title="Key Focus Areas">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newFocusArea}
              onChange={(e) => setNewFocusArea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFocusArea())}
              className="flex-1 px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="Add a focus area..."
            />
            <button
              onClick={addFocusArea}
              className="px-3 py-2 text-sm rounded-lg border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--scout-border)' }}
            >
              Add
            </button>
          </div>

          {(formData.key_focus_areas?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.key_focus_areas?.map((area, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border"
                  style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                >
                  {area}
                  <button
                    onClick={() => removeFocusArea(index)}
                    className="ml-1 hover:text-red-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </DrawerSection>

      {/* Metrics */}
      <DrawerSection title="Metrics (Optional)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Headcount
            </label>
            <input
              type="number"
              value={formData.headcount || ''}
              onChange={(e) => handleChange('headcount', e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., 5000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>
              Revenue Estimate
            </label>
            <input
              type="text"
              value={formData.revenue_estimate || ''}
              onChange={(e) => handleChange('revenue_estimate', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--scout-border)' }}
              placeholder="e.g., $2.5B"
            />
          </div>
        </div>
      </DrawerSection>

      {/* Stakeholders in this Division */}
      {!isCreate && divisionStakeholders.length > 0 && (
        <DrawerSection title={`Stakeholders (${divisionStakeholders.length})`}>
          <div className="space-y-2">
            {divisionStakeholders.map(s => (
              <div
                key={s.stakeholder_id}
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--scout-parchment)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                  {s.full_name}
                </span>
                {s.title && (
                  <span className="text-xs ml-2" style={{ color: 'var(--scout-earth-light)' }}>
                    {s.title}
                  </span>
                )}
              </div>
            ))}
          </div>
        </DrawerSection>
      )}
    </AccountDrawer>
  )
}
