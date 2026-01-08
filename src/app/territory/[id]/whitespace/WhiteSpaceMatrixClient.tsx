'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Division {
  division_id: string
  name: string
  description?: string
  division_type?: string
}

interface ProductUsage {
  usage_id: string
  account_plan_id: string
  division_id: string | null
  product_module: string
  usage_status: string | null
  notes?: string
}

interface WhiteSpaceMatrixClientProps {
  accountId: string
  accountName: string
  initialDivisions: Division[]
  initialUsage: ProductUsage[]
  initialProducts: string[]
}

// Default products for C2A
const DEFAULT_PRODUCTS = [
  'EVSec Analysis',
  'EVSec BOM Management',
  'Vulnerability Management',
  'Threat Intelligence',
  'Workflow Automation',
  'BI & Reporting',
]

type UsageStatus = 'used' | 'under_utilized' | 'not_sold' | 'n_a' | null

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  used: { label: 'Used', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: '✓' },
  under_utilized: { label: 'Under-utilized', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: '⚠' },
  not_sold: { label: 'Not Sold', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', icon: '—' },
  n_a: { label: 'N/A', bg: 'bg-zinc-50 dark:bg-zinc-900', text: 'text-zinc-400 dark:text-zinc-500', icon: 'N/A' },
}

export function WhiteSpaceMatrixClient({
  accountId,
  accountName,
  initialDivisions,
  initialUsage,
  initialProducts,
}: WhiteSpaceMatrixClientProps) {
  const router = useRouter()
  const [divisions] = useState<Division[]>(initialDivisions)
  const [usage, setUsage] = useState<ProductUsage[]>(initialUsage)
  const [products, setProducts] = useState<string[]>(
    initialProducts.length > 0 ? initialProducts : DEFAULT_PRODUCTS
  )
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [activeCell, setActiveCell] = useState<{ divisionId: string; product: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Get usage record for a division/product combination
  const getUsage = useCallback((divisionId: string, product: string): ProductUsage | undefined => {
    return usage.find(u => u.division_id === divisionId && u.product_module === product)
  }, [usage])

  // Update cell status
  const updateCellStatus = useCallback(async (divisionId: string, product: string, status: UsageStatus) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}/whitespace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division_id: divisionId,
          product_module: product,
          usage_status: status,
        }),
      })

      if (response.ok) {
        const { usage: newUsage } = await response.json()
        setUsage(prev => {
          const existing = prev.findIndex(u => u.division_id === divisionId && u.product_module === product)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newUsage
            return updated
          }
          return [...prev, newUsage]
        })
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setSaving(false)
      setActiveCell(null)
    }
  }, [accountId])

  // Add new product
  const addProduct = useCallback(async () => {
    if (!newProductName.trim()) return

    try {
      const response = await fetch(`/api/accounts/${accountId}/whitespace/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_module: newProductName.trim() }),
      })

      if (response.ok) {
        setProducts(prev => [...prev, newProductName.trim()].sort())
        setNewProductName('')
        setIsAddProductOpen(false)
      }
    } catch (error) {
      console.error('Failed to add product:', error)
    }
  }, [accountId, newProductName])

  // Create Trail from whitespace opportunity
  const createTrail = useCallback(async (divisionId: string, divisionName: string, product: string) => {
    try {
      const response = await fetch('/api/scout-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountId,
          title: `${product} - ${divisionName}`,
          description: 'Expansion opportunity identified from white space analysis',
          status: 'exploring',
          size: 'medium',
        }),
      })

      if (response.ok) {
        router.push(`/territory/${accountId}`)
      }
    } catch (error) {
      console.error('Failed to create trail:', error)
    }
  }, [accountId, router])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment, #faf8f5)' }}>
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/territory/${accountId}`}
            className="text-sm hover:underline mb-2 inline-block"
            style={{ color: 'var(--scout-earth-light, #8b7355)' }}
          >
            ← Back to Territory
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--scout-earth, #5c4d3d)' }}>
                {accountName}
              </h1>
              <p className="text-lg" style={{ color: 'var(--scout-earth-light, #8b7355)' }}>
                White Space Matrix
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-white"
                style={{ borderColor: 'var(--scout-border, #e5e0d8)', color: 'var(--scout-earth, #5c4d3d)' }}
              >
                + Add Product
              </button>
              <Link
                href={`/territory/${accountId}`}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--scout-saddle, #8b4513)', color: 'white' }}
              >
                Manage Terrain
              </Link>
            </div>
          </div>
        </div>

        {/* Matrix */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--scout-white, #ffffff)', borderColor: 'var(--scout-border, #e5e0d8)' }}
        >
          {divisions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg mb-4" style={{ color: 'var(--scout-earth-light, #8b7355)' }}>
                No divisions defined yet
              </p>
              <Link
                href={`/territory/${accountId}`}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-block"
                style={{ backgroundColor: 'var(--scout-saddle, #8b4513)', color: 'white' }}
              >
                Add Divisions in Terrain
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--scout-parchment, #faf8f5)' }}>
                    <th
                      className="p-3 text-left text-sm font-semibold border-b border-r"
                      style={{ borderColor: 'var(--scout-border, #e5e0d8)', color: 'var(--scout-earth, #5c4d3d)', minWidth: '180px' }}
                    >
                      Division
                    </th>
                    {products.map(product => (
                      <th
                        key={product}
                        className="p-3 text-center text-sm font-semibold border-b"
                        style={{ borderColor: 'var(--scout-border, #e5e0d8)', color: 'var(--scout-earth, #5c4d3d)', minWidth: '120px' }}
                      >
                        {product}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {divisions.map((division, idx) => (
                    <tr key={division.division_id}>
                      <td
                        className="p-3 text-sm font-medium border-r"
                        style={{
                          borderColor: 'var(--scout-border, #e5e0d8)',
                          color: 'var(--scout-earth, #5c4d3d)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--scout-parchment, #faf8f5)',
                        }}
                      >
                        <div>{division.name}</div>
                        {division.division_type && division.division_type !== 'division' && (
                          <div className="text-xs" style={{ color: 'var(--scout-earth-light, #8b7355)' }}>
                            {division.division_type}
                          </div>
                        )}
                      </td>
                      {products.map(product => {
                        const cellUsage = getUsage(division.division_id, product)
                        const status = cellUsage?.usage_status as UsageStatus
                        const config = status ? STATUS_CONFIG[status] : null
                        const isActive = activeCell?.divisionId === division.division_id && activeCell?.product === product

                        return (
                          <td
                            key={product}
                            className="p-2 text-center border-l relative"
                            style={{
                              borderColor: 'var(--scout-border, #e5e0d8)',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--scout-parchment, #faf8f5)',
                            }}
                          >
                            <button
                              onClick={() => setActiveCell({ divisionId: division.division_id, product })}
                              className={`w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                                config ? `${config.bg} ${config.text}` : 'bg-white hover:bg-zinc-50 border border-dashed border-zinc-300'
                              }`}
                              disabled={saving}
                            >
                              {config ? config.icon : '+'}
                            </button>

                            {/* Status Dropdown */}
                            {isActive && (
                              <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-lg border p-2 min-w-[160px]">
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <button
                                    key={key}
                                    onClick={() => updateCellStatus(division.division_id, product, key as UsageStatus)}
                                    className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-zinc-50 flex items-center gap-2 ${cfg.text}`}
                                  >
                                    <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${cfg.bg}`}>
                                      {cfg.icon}
                                    </span>
                                    {cfg.label}
                                  </button>
                                ))}
                                <div className="border-t my-2" style={{ borderColor: 'var(--scout-border, #e5e0d8)' }} />
                                <button
                                  onClick={() => updateCellStatus(division.division_id, product, null)}
                                  className="w-full px-3 py-2 text-left text-sm rounded hover:bg-zinc-50 text-zinc-500"
                                >
                                  Clear
                                </button>
                                {(status === 'not_sold' || status === 'under_utilized') && (
                                  <>
                                    <div className="border-t my-2" style={{ borderColor: 'var(--scout-border, #e5e0d8)' }} />
                                    <button
                                      onClick={() => createTrail(division.division_id, division.name, product)}
                                      className="w-full px-3 py-2 text-left text-sm rounded hover:bg-amber-50 text-amber-700 font-medium"
                                    >
                                      🔥 Create Trail
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setActiveCell(null)}
                                  className="w-full px-3 py-1 text-xs text-zinc-400 hover:text-zinc-600 mt-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-sm" style={{ color: 'var(--scout-earth-light, #8b7355)' }}>
          <span className="font-medium">Legend:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${cfg.bg} ${cfg.text}`}>
                {cfg.icon}
              </span>
              <span>{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* Add Product Modal */}
        {isAddProductOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddProductOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--scout-earth, #5c4d3d)' }}>
                Add Product Module
              </h2>
              <input
                type="text"
                value={newProductName}
                onChange={e => setNewProductName(e.target.value)}
                placeholder="Product name..."
                className="w-full px-4 py-2 rounded-lg border mb-4"
                style={{ borderColor: 'var(--scout-border, #e5e0d8)' }}
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg hover:bg-zinc-100"
                  style={{ color: 'var(--scout-earth, #5c4d3d)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addProduct}
                  disabled={!newProductName.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-saddle, #8b4513)' }}
                >
                  Add Product
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
