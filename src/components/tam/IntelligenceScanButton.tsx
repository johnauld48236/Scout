'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function IntelligenceScanButton() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<{
    signals_found: number
    accounts_matched: number
  } | null>(null)

  async function handleIntelligenceScan() {
    setIsScanning(true)
    setResult(null)
    try {
      const res = await fetch('/api/tam/intelligence-scan', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Scan failed')
      }
      const { data } = await res.json()
      setResult({
        signals_found: data.signals_found,
        accounts_matched: data.accounts_matched,
      })
      // Refresh the page to show new signals
      setTimeout(() => {
        router.refresh()
      }, 2000)
    } catch (error) {
      console.error('Intelligence scan failed:', error)
      alert('Intelligence scan failed. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-green-600 dark:text-green-400">
          {result.signals_found} signals, {result.accounts_matched} matched
        </span>
      )}
      <button
        onClick={handleIntelligenceScan}
        disabled={isScanning}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-2"
      >
        {isScanning ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Run Intelligence Scan
          </>
        )}
      </button>
    </div>
  )
}
