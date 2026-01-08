'use client'

import { useState } from 'react'
import { X, FileText, Loader2, Check, AlertTriangle, Zap, Users, ChevronDown, Trash2 } from 'lucide-react'

interface ExtractedItem {
  id: string
  type: 'action_item' | 'risk' | 'customer_request' | 'signal' | 'stakeholder_update'
  text: string
  suggested_priority?: 'high' | 'medium' | 'low'
  suggested_severity?: 'critical' | 'high' | 'medium' | 'low'
  category?: string
  stakeholder_name?: string
  stakeholder_title?: string
  selected?: boolean
}

interface ImportNotesDrawerProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  accountName: string
  onImportComplete: () => void
}

type Step = 'paste' | 'processing' | 'review' | 'importing' | 'complete'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  action_item: { label: 'Action', icon: <Check className="w-3 h-3" />, bg: 'bg-blue-100', text: 'text-blue-700' },
  risk: { label: 'Risk', icon: <AlertTriangle className="w-3 h-3" />, bg: 'bg-red-100', text: 'text-red-700' },
  customer_request: { label: 'Request', icon: <FileText className="w-3 h-3" />, bg: 'bg-purple-100', text: 'text-purple-700' },
  signal: { label: 'Signal', icon: <Zap className="w-3 h-3" />, bg: 'bg-yellow-100', text: 'text-yellow-700' },
  stakeholder_update: { label: 'Stakeholder', icon: <Users className="w-3 h-3" />, bg: 'bg-green-100', text: 'text-green-700' },
}

const PRIORITY_OPTIONS = ['high', 'medium', 'low']
const SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low']
const TYPE_OPTIONS: ExtractedItem['type'][] = ['action_item', 'risk', 'customer_request', 'signal', 'stakeholder_update']

export function ImportNotesDrawer({
  isOpen,
  onClose,
  accountId,
  accountName,
  onImportComplete,
}: ImportNotesDrawerProps) {
  const [step, setStep] = useState<Step>('paste')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ message: string } | null>(null)

  const handleClose = () => {
    setStep('paste')
    setNotes('')
    setItems([])
    setError(null)
    setImportResult(null)
    onClose()
  }

  const handleProcessNotes = async () => {
    if (!notes.trim()) return

    setStep('processing')
    setError(null)

    try {
      const response = await fetch(`/api/accounts/${accountId}/import-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to process notes')
      }

      const data = await response.json()
      // Mark all items as selected by default
      const itemsWithSelection = data.items.map((item: ExtractedItem) => ({
        ...item,
        selected: true,
      }))
      setItems(itemsWithSelection)
      setStep('review')
    } catch (err) {
      setError('Failed to process notes. Please try again.')
      setStep('paste')
    }
  }

  const handleToggleItem = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ))
  }

  const handleUpdateItem = (id: string, updates: Partial<ExtractedItem>) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleSelectAll = () => {
    const allSelected = items.every(item => item.selected)
    setItems(items.map(item => ({ ...item, selected: !allSelected })))
  }

  const handleImport = async () => {
    const selectedItems = items.filter(item => item.selected)
    if (selectedItems.length === 0) return

    setStep('importing')
    setError(null)

    try {
      const response = await fetch(`/api/accounts/${accountId}/import-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems }),
      })

      if (!response.ok) {
        throw new Error('Failed to import items')
      }

      const result = await response.json()
      setImportResult(result)
      setStep('complete')
      onImportComplete()
    } catch (err) {
      setError('Failed to import items. Please try again.')
      setStep('review')
    }
  }

  if (!isOpen) return null

  const selectedCount = items.filter(item => item.selected).length

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={handleClose}
      />

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
            <FileText className="w-5 h-5" style={{ color: 'var(--scout-trail)' }} />
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-saddle)' }}>
                Import Meeting Notes
              </h2>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {accountName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--scout-earth)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Paste Notes */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--scout-saddle)' }}
                >
                  Paste your meeting notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste meeting notes, call transcript, or email summary here..."
                  className="w-full h-80 p-4 rounded-lg border resize-none text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--scout-border)',
                    color: 'var(--scout-earth)',
                    backgroundColor: 'var(--scout-parchment)',
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                AI will extract action items, risks, customer requests, signals, and stakeholder updates.
              </p>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--scout-trail)' }} />
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Analyzing notes and extracting items...
              </p>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {items.length} items extracted
                </p>
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  {items.every(item => item.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    No actionable items found in the notes.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => {
                    const config = TYPE_CONFIG[item.type]
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all ${
                          item.selected ? 'ring-2 ring-offset-1 ring-green-600' : 'opacity-60'
                        }`}
                        style={{
                          borderColor: 'var(--scout-border)',
                        }}
                      >
                        {/* Row 1: Checkbox + Type badge + Delete */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="w-4 h-4 rounded"
                            />
                            <select
                              value={item.type}
                              onChange={(e) => handleUpdateItem(item.id, { type: e.target.value as ExtractedItem['type'] })}
                              className={`text-xs px-2 py-1 rounded ${config.bg} ${config.text} border-0 font-medium`}
                            >
                              {TYPE_OPTIONS.map(type => (
                                <option key={type} value={type}>
                                  {TYPE_CONFIG[type].label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>

                        {/* Row 2: Text (editable) */}
                        <textarea
                          value={item.text}
                          onChange={(e) => handleUpdateItem(item.id, { text: e.target.value })}
                          className="w-full text-sm p-2 rounded border resize-none"
                          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
                          rows={2}
                        />

                        {/* Row 3: Priority/Severity selector */}
                        <div className="flex items-center gap-2 mt-2">
                          {(item.type === 'action_item' || item.type === 'customer_request') && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                                Priority:
                              </span>
                              <select
                                value={item.suggested_priority || 'medium'}
                                onChange={(e) => handleUpdateItem(item.id, { suggested_priority: e.target.value as 'high' | 'medium' | 'low' })}
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: 'var(--scout-border)' }}
                              >
                                {PRIORITY_OPTIONS.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {item.type === 'risk' && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: 'var(--scout-earth-light)' }}>
                                Severity:
                              </span>
                              <select
                                value={item.suggested_severity || 'medium'}
                                onChange={(e) => handleUpdateItem(item.id, { suggested_severity: e.target.value as 'critical' | 'high' | 'medium' | 'low' })}
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: 'var(--scout-border)' }}
                              >
                                {SEVERITY_OPTIONS.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {item.type === 'signal' && item.category && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                            >
                              {item.category.replace('_', ' ')}
                            </span>
                          )}
                          {item.type === 'stakeholder_update' && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                            >
                              {item.stakeholder_name} {item.stakeholder_title && `- ${item.stakeholder_title}`}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--scout-trail)' }} />
              <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                Importing {selectedCount} items...
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)' }}
              >
                <Check className="w-6 h-6" style={{ color: 'var(--scout-trail)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                Import Complete
              </p>
              {importResult && (
                <p className="text-xs text-center" style={{ color: 'var(--scout-earth-light)' }}>
                  {importResult.message}
                </p>
              )}
              <p className="text-xs text-center" style={{ color: 'var(--scout-earth-light)' }}>
                Items have been added with review flags. Check each section to allocate them to specific pursuits or buckets.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex justify-between"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          {step === 'paste' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessNotes}
                disabled={!notes.trim()}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Process Notes
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                onClick={() => {
                  setStep('paste')
                  setItems([])
                }}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-4 py-2 text-sm rounded-lg font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                Import {selectedCount} Selected
              </button>
            </>
          )}

          {step === 'complete' && (
            <button
              onClick={handleClose}
              className="ml-auto px-4 py-2 text-sm rounded-lg font-medium text-white"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
