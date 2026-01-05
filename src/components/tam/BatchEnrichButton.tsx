'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  pendingCount: number
}

export function BatchEnrichButton({ pendingCount }: Props) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)
  const [result, setResult] = useState<{ enriched: number; failed: number } | null>(null)

  async function handleBatchEnrich() {
    if (pendingCount === 0) return

    setIsEnriching(true)
    setResult(null)

    try {
      const res = await fetch('/api/tam/enrich-batch', { method: 'POST' })
      const { data, error } = await res.json()

      if (error) {
        alert(`Enrichment failed: ${error}`)
        return
      }

      setResult({ enriched: data.enriched_count, failed: data.failed_count })

      // Refresh page data
      router.refresh()

    } catch {
      alert('Batch enrichment failed')
    } finally {
      setIsEnriching(false)
    }
  }

  if (pendingCount === 0 && !result) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm" style={{ color: 'var(--scout-trail)' }}>
          Enriched {result.enriched}{result.failed > 0 ? `, ${result.failed} failed` : ''}
        </span>
      )}
      {pendingCount > 0 && (
        <button
          onClick={handleBatchEnrich}
          disabled={isEnriching}
          className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--scout-sky)',
            color: 'white'
          }}
        >
          {isEnriching ? 'Enriching...' : `Enrich ${pendingCount} Pending`}
        </button>
      )}
    </div>
  )
}
