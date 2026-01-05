'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PipelineChange {
  id: string
  deal_name: string
  company_name: string
  change_type: 'new' | 'modified' | 'unchanged' | 'removed'
  current?: {
    pursuit_id: string
    stage: string
    estimated_value: number | null
    deal_owner: string | null
    target_quarter: string | null
    pursuit_type: string | null
  }
  proposed?: {
    stage: string
    estimated_value: number | null
    deal_owner: string | null
    target_quarter: string | null
    pursuit_type: string | null
    close_date?: string | null
    vertical?: string | null
  }
  changes?: string[]
}

interface AccountAssignment {
  account_name: string
  sales_manager: string | null
  account_manager: string | null
}

interface PreviewResponse {
  summary: {
    new: number
    modified: number
    unchanged: number
    removed: number
    total: number
  }
  changes: PipelineChange[]
  timestamp: string
}

interface PipelineImportReviewProps {
  onClose?: () => void
}

export function PipelineImportReview({ onClose }: PipelineImportReviewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<'all' | 'new' | 'modified' | 'removed'>('all')
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedResult, setAppliedResult] = useState<{ created: number; updated: number; removed: number; accountsUpdated: number } | null>(null)
  const [accountAssignments, setAccountAssignments] = useState<AccountAssignment[]>([])

  // Load preview from current database state
  const loadPreview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/pipeline-import/preview')
      if (!response.ok) throw new Error('Failed to load preview')
      const data = await response.json()
      setPreview(data)

      // Pre-select all new and modified changes
      const preSelected = new Set<string>()
      data.changes.forEach((c: PipelineChange) => {
        if (c.change_type === 'new' || c.change_type === 'modified') {
          preSelected.add(c.id)
        }
      })
      setSelectedChanges(preSelected)
    } catch (err) {
      setError('Failed to load pipeline preview')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Parse spreadsheet data and compare
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Parse the Excel file via the API
      const formData = new FormData()
      formData.append('file', file)

      const parseResponse = await fetch('/api/pipeline-import/parse', {
        method: 'POST',
        body: formData,
      })

      if (!parseResponse.ok) {
        const parseError = await parseResponse.json()
        throw new Error(parseError.error || 'Failed to parse Excel file')
      }

      const parseData = await parseResponse.json()

      // Store account assignments for later use in apply
      if (parseData.accountAssignments) {
        setAccountAssignments(parseData.accountAssignments)
      }

      // Now compare parsed deals with database
      const response = await fetch('/api/pipeline-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: parseData.deals }),
      })

      if (!response.ok) throw new Error('Failed to compare pipeline')
      const data = await response.json()
      setPreview(data)

      // Pre-select all new and modified changes
      const preSelected = new Set<string>()
      data.changes.forEach((c: PipelineChange) => {
        if (c.change_type === 'new' || c.change_type === 'modified') {
          preSelected.add(c.id)
        }
      })
      setSelectedChanges(preSelected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse and compare pipeline file')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Apply selected changes
  const handleApply = async () => {
    if (!preview) return

    const changesToApply = preview.changes.filter(
      c => selectedChanges.has(c.id) && c.change_type !== 'unchanged'
    )

    if (changesToApply.length === 0) {
      setError('No changes selected to apply')
      return
    }

    setIsApplying(true)
    setError(null)

    try {
      const response = await fetch('/api/pipeline-import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: changesToApply,
          accountAssignments: accountAssignments.length > 0 ? accountAssignments : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply changes')
      }

      // Show errors if any, but still proceed if some operations succeeded
      if (data.errors && data.errors.length > 0) {
        console.error('Import errors:', data.errors)
        setError(`Completed with ${data.errors.length} error(s): ${data.errors.slice(0, 3).join('; ')}${data.errors.length > 3 ? '...' : ''}`)
      }

      if (!data.success) {
        throw new Error(data.errors?.join('; ') || 'All operations failed')
      }

      setAppliedResult(data.results)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
      console.error(err)
    } finally {
      setIsApplying(false)
    }
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedChanges)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedChanges(newSelection)
  }

  const selectAll = (type: 'new' | 'modified' | 'removed') => {
    if (!preview) return
    const newSelection = new Set(selectedChanges)
    preview.changes.filter(c => c.change_type === type).forEach(c => newSelection.add(c.id))
    setSelectedChanges(newSelection)
  }

  const deselectAll = (type: 'new' | 'modified' | 'removed') => {
    if (!preview) return
    const newSelection = new Set(selectedChanges)
    preview.changes.filter(c => c.change_type === type).forEach(c => newSelection.delete(c.id))
    setSelectedChanges(newSelection)
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const filteredChanges = preview?.changes.filter(c => {
    if (filterType === 'all') return showUnchanged || c.change_type !== 'unchanged'
    return c.change_type === filterType
  }) || []

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'new': return { bg: 'rgba(93, 122, 93, 0.1)', text: 'var(--scout-trail)', border: 'var(--scout-trail)' }
      case 'modified': return { bg: 'rgba(56, 152, 199, 0.1)', text: 'var(--scout-sky)', border: 'var(--scout-sky)' }
      case 'removed': return { bg: 'rgba(169, 68, 66, 0.1)', text: 'var(--scout-clay)', border: 'var(--scout-clay)' }
      default: return { bg: 'rgba(139, 119, 101, 0.1)', text: 'var(--scout-earth-light)', border: 'var(--scout-border)' }
    }
  }

  // Success state after applying
  if (appliedResult) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border p-6" style={{ borderColor: 'var(--scout-border)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
            Import Complete
          </h3>
          <div className="space-y-1 text-sm mb-6" style={{ color: 'var(--scout-earth)' }}>
            {appliedResult.created > 0 && <p>{appliedResult.created} new deals created</p>}
            {appliedResult.updated > 0 && <p>{appliedResult.updated} deals updated</p>}
            {appliedResult.removed > 0 && <p>{appliedResult.removed} deals removed</p>}
            {appliedResult.accountsUpdated > 0 && <p>{appliedResult.accountsUpdated} account owners updated</p>}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-white"
            style={{ backgroundColor: 'var(--scout-sky)' }}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border" style={{ borderColor: 'var(--scout-border)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
            Pipeline Import Review
          </h3>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <svg className="w-5 h-5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--scout-earth-light)' }}>
          Review changes before applying to your pipeline
        </p>
      </div>

      {/* Initial state - no preview yet */}
      {!preview && !isLoading && (
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--scout-parchment)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h4 className="font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
              Upload Pipeline Spreadsheet
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
              Upload your Excel file to compare against the current pipeline
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--scout-border)' }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <svg className="w-5 h-5" style={{ color: 'var(--scout-sky)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span style={{ color: 'var(--scout-sky)' }}>Choose File</span>
            </label>

            <div className="text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>or</div>

            <button
              onClick={loadPreview}
              className="px-4 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              View Current Pipeline State
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3" style={{ borderColor: 'var(--scout-sky)' }} />
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Analyzing pipeline changes...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="m-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)' }}>
          <p className="text-sm" style={{ color: 'var(--scout-clay)' }}>{error}</p>
        </div>
      )}

      {/* Preview results */}
      {preview && !isLoading && (
        <>
          {/* Summary */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--scout-trail)' }}>
                  +{preview.summary.new} New
                </span>
                <button
                  onClick={() => preview.summary.new > 0 && (selectedChanges.has(preview.changes.find(c => c.change_type === 'new')?.id || '') ? deselectAll('new') : selectAll('new'))}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
                >
                  {preview.changes.filter(c => c.change_type === 'new' && selectedChanges.has(c.id)).length === preview.summary.new ? 'Deselect' : 'Select All'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--scout-sky)' }}>
                  ~{preview.summary.modified} Modified
                </span>
                <button
                  onClick={() => preview.summary.modified > 0 && (selectedChanges.has(preview.changes.find(c => c.change_type === 'modified')?.id || '') ? deselectAll('modified') : selectAll('modified'))}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                >
                  {preview.changes.filter(c => c.change_type === 'modified' && selectedChanges.has(c.id)).length === preview.summary.modified ? 'Deselect' : 'Select All'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--scout-clay)' }}>
                  -{preview.summary.removed} Removed
                </span>
                <button
                  onClick={() => preview.summary.removed > 0 && (preview.changes.filter(c => c.change_type === 'removed' && selectedChanges.has(c.id)).length > 0 ? deselectAll('removed') : selectAll('removed'))}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                >
                  {preview.changes.filter(c => c.change_type === 'removed' && selectedChanges.has(c.id)).length === preview.summary.removed ? 'Deselect' : 'Select All'}
                </button>
              </div>
              <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {preview.summary.unchanged} Unchanged
              </span>
            </div>
            {/* Account assignments info */}
            {accountAssignments.length > 0 && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  {accountAssignments.length} account owner assignments will also be applied
                </span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
            <div className="flex gap-1">
              {(['all', 'new', 'modified', 'removed'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-1 text-xs rounded ${filterType === type ? 'font-medium' : ''}`}
                  style={{
                    backgroundColor: filterType === type ? 'var(--scout-parchment)' : 'transparent',
                    color: filterType === type ? 'var(--scout-earth)' : 'var(--scout-earth-light)',
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--scout-earth-light)' }}>
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(e) => setShowUnchanged(e.target.checked)}
                className="w-3 h-3"
              />
              Show unchanged
            </label>
          </div>

          {/* Changes list */}
          <div className="max-h-96 overflow-y-auto">
            {filteredChanges.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                No changes to display
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--scout-border)' }}>
                {filteredChanges.map(change => {
                  const colors = getChangeTypeColor(change.change_type)
                  const isSelected = selectedChanges.has(change.id)

                  return (
                    <div
                      key={change.id}
                      className="p-3 hover:bg-gray-50 transition-colors"
                      style={{ backgroundColor: isSelected && change.change_type !== 'unchanged' ? colors.bg : undefined }}
                    >
                      <div className="flex items-start gap-3">
                        {change.change_type !== 'unchanged' && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(change.id)}
                            className="w-4 h-4 mt-0.5"
                            style={{ accentColor: colors.text }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {change.change_type}
                            </span>
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--scout-earth)' }}>
                              {change.deal_name}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                            {change.company_name}
                          </p>

                          {/* Show changes for modified items */}
                          {change.changes && change.changes.length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {change.changes.map((c, i) => (
                                <p key={i} className="text-xs" style={{ color: 'var(--scout-sky)' }}>
                                  {c}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Show proposed values for new items */}
                          {change.change_type === 'new' && change.proposed && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}>
                                {change.proposed.stage}
                              </span>
                              {change.proposed.estimated_value && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}>
                                  {formatCurrency(change.proposed.estimated_value)}
                                </span>
                              )}
                              {change.proposed.target_quarter && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}>
                                  {change.proposed.target_quarter}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Show current values for removed items */}
                          {change.change_type === 'removed' && change.current && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}>
                                {change.current.stage}
                              </span>
                              {change.current.estimated_value && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}>
                                  {formatCurrency(change.current.estimated_value)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {selectedChanges.size} changes selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded border"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={selectedChanges.size === 0 || isApplying}
                className="px-4 py-1.5 text-sm rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-sky)' }}
              >
                {isApplying ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
