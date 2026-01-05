'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedAccount {
  company_name: string
  website: string | null
  vertical: string
  fit_tier: string | null
  estimated_deal_value: number | null
  company_summary: string | null
}

interface TamChange {
  id: string
  company_name: string
  vertical: string
  change_type: 'new' | 'modified' | 'unchanged'
  proposed?: {
    vertical: string
    website: string | null
    fit_tier: string | null
    estimated_deal_value: number | null
    company_summary: string | null
  }
  changes?: string[]
}

interface PreviewSummary {
  new: number
  modified: number
  unchanged: number
  total: number
}

export function TAMImportModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'applying' | 'done'>('upload')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<ParsedAccount[]>([])
  const [changes, setChanges] = useState<TamChange[]>([])
  const [summary, setSummary] = useState<PreviewSummary | null>(null)
  const [parseSummary, setParseSummary] = useState<{ byVertical: Record<string, number> } | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ sheetDetails?: Record<string, { headers: string[]; rowCount: number; companyCol: string | null; headerRow?: number }> } | null>(null)
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      // Parse the file
      const formData = new FormData()
      formData.append('file', file)

      const parseRes = await fetch('/api/tam-import/parse', {
        method: 'POST',
        body: formData,
      })

      if (!parseRes.ok) {
        const err = await parseRes.json()
        throw new Error(err.error || 'Failed to parse file')
      }

      const parseData = await parseRes.json()
      setAccounts(parseData.accounts)
      setParseSummary(parseData.summary)
      setDebugInfo(parseData.debug)

      // Get preview comparison
      const previewRes = await fetch('/api/tam-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: parseData.accounts }),
      })

      if (!previewRes.ok) {
        const err = await previewRes.json()
        throw new Error(err.error || 'Failed to generate preview')
      }

      const previewData = await previewRes.json()
      setChanges(previewData.changes)
      setSummary(previewData.summary)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    setStep('applying')
    setError(null)

    try {
      // Only apply new and modified changes
      const toApply = changes.filter(c => c.change_type !== 'unchanged')

      const res = await fetch('/api/tam-import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: toApply }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to apply changes')
      }

      const data = await res.json()
      setResult(data.results)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes')
      setStep('preview')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('upload')
    setError(null)
    setAccounts([])
    setChanges([])
    setSummary(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (step === 'done') {
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Import TAM List
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {step === 'upload' && 'Import TAM Accounts'}
                {step === 'preview' && 'Preview Import'}
                {step === 'applying' && 'Applying Changes...'}
                {step === 'done' && 'Import Complete'}
              </h2>
              <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {step === 'upload' && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Upload an Excel file with TAM accounts. Each sheet will be treated as a vertical/campaign category.
                  </p>
                  <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="tam-file-input"
                    />
                    <label
                      htmlFor="tam-file-input"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {isLoading ? 'Processing...' : 'Choose file or drag here'}
                    </label>
                    <p className="text-xs text-zinc-500 mt-2">
                      Supports .xlsx and .xls files
                    </p>
                  </div>
                </div>
              )}

              {step === 'preview' && summary && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{summary.new}</p>
                      <p className="text-xs text-green-700 dark:text-green-400">New</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{summary.modified}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">Modified</p>
                    </div>
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center">
                      <p className="text-2xl font-bold text-zinc-500">{summary.unchanged}</p>
                      <p className="text-xs text-zinc-500">Unchanged</p>
                    </div>
                  </div>

                  {/* By Vertical */}
                  {parseSummary?.byVertical && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <p className="text-xs font-medium text-zinc-500 mb-2">By Vertical/Campaign:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(parseSummary.byVertical).map(([v, count]) => (
                          <span key={v} className="px-2 py-1 bg-white dark:bg-zinc-700 rounded text-xs">
                            {v}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Changes list */}
                  {(summary.new > 0 || summary.modified > 0) && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Company</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Vertical</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {changes.filter(c => c.change_type !== 'unchanged').slice(0, 20).map((change) => (
                            <tr key={change.id}>
                              <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                                {change.company_name}
                              </td>
                              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                                {change.vertical}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  change.change_type === 'new'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {change.change_type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {changes.filter(c => c.change_type !== 'unchanged').length > 20 && (
                        <p className="px-3 py-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800">
                          + {changes.filter(c => c.change_type !== 'unchanged').length - 20} more...
                        </p>
                      )}
                    </div>
                  )}

                  {summary.new === 0 && summary.modified === 0 && summary.unchanged === 0 && debugInfo?.sheetDetails && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-sm font-medium text-yellow-700 mb-2">No accounts found. Sheet analysis:</p>
                      {Object.entries(debugInfo.sheetDetails).map(([sheet, info]) => (
                        <div key={sheet} className="text-xs text-yellow-600 mb-2">
                          <p className="font-medium">{sheet} ({info.rowCount} rows, header row {info.headerRow || 1})</p>
                          <p>Company column: {info.companyCol || 'NOT FOUND'}</p>
                          <p>Headers: {info.headers.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {summary.new === 0 && summary.modified === 0 && summary.unchanged > 0 && (
                    <p className="text-center text-zinc-500 py-4">
                      No new accounts to import. All {summary.unchanged} accounts already exist.
                    </p>
                  )}
                </div>
              )}

              {step === 'applying' && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-zinc-600 dark:text-zinc-400">Importing accounts...</span>
                </div>
              )}

              {step === 'done' && result && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-lg font-semibold text-green-600">Import Complete!</p>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Created {result.created}, updated {result.updated} accounts
                    </p>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-xs font-medium text-yellow-700 mb-1">Some errors occurred:</p>
                      <ul className="text-xs text-yellow-600 space-y-1">
                        {result.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
              {step === 'preview' && (
                <>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                  {(summary?.new || 0) + (summary?.modified || 0) > 0 && (
                    <button
                      onClick={handleApply}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Import {(summary?.new || 0) + (summary?.modified || 0)} Accounts
                    </button>
                  )}
                </>
              )}
              {step === 'done' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
