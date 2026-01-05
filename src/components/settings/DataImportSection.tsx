'use client'

import { useState, useEffect } from 'react'
import { LeadsImportButton } from '@/components/medical/MedicalImportButton'
import { PipelineImportButton } from '@/components/pipeline/PipelineImportButton'

interface ContactStats {
  total: number
  linkedToTam: number
  uniqueCompanies: number
}

export function DataImportSection() {
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRelinking, setIsRelinking] = useState(false)
  const [relinkResult, setRelinkResult] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/medical-import/apply?stats=true')
      if (response.ok) {
        const data = await response.json()
        if (data.stats) {
          setStats(data.stats)
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRelink = async () => {
    setIsRelinking(true)
    setRelinkResult(null)
    try {
      const response = await fetch('/api/medical-import/apply', { method: 'PATCH' })
      if (response.ok) {
        const data = await response.json()
        const parts = []
        if (data.results.tamAccountsCreated > 0) {
          parts.push(`Created ${data.results.tamAccountsCreated} new TAM accounts`)
        }
        if (data.results.linkedToTam > 0) {
          parts.push(`Linked ${data.results.linkedToTam} contacts`)
        }
        setRelinkResult(parts.length > 0 ? parts.join('. ') : 'All contacts already linked')
        // Refresh stats
        await loadStats()
      }
    } catch (error) {
      console.error('Failed to re-link:', error)
      setRelinkResult('Failed to re-link contacts')
    } finally {
      setIsRelinking(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Import */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Import Pipeline
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Import deals and opportunities from Excel/CSV. Creates pursuits linked to account plans with stage, value, and close date.
            </p>
            <PipelineImportButton />
          </div>
        </div>
      </div>

      {/* Leads Import */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Import Leads
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Import contact lists from Excel files. Contacts will be matched to TAM accounts and available when building account plans.
            </p>
            <div className="flex items-center gap-2">
              <LeadsImportButton />
              {stats && stats.total > 0 && stats.linkedToTam < stats.total && (
                <button
                  onClick={handleRelink}
                  disabled={isRelinking}
                  className="text-xs px-3 py-1.5 rounded border hover:bg-white dark:bg-zinc-900 disabled:opacity-50"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--accent-primary)' }}
                  title="Re-match contacts to TAM accounts"
                >
                  {isRelinking ? 'Linking...' : 'Re-link to TAM'}
                </button>
              )}
            </div>
            {relinkResult && (
              <p className="text-xs mt-2" style={{ color: 'var(--status-success)' }}>
                {relinkResult}
              </p>
            )}
          </div>

          {/* Stats summary */}
          {!isLoading && stats && stats.total > 0 && (
            <div className="text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <p><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stats.total}</span> contacts imported</p>
              <p><span className="font-medium" style={{ color: 'var(--status-success)' }}>{stats.linkedToTam}</span> linked to TAM accounts</p>
              <p><span className="font-medium">{stats.uniqueCompanies}</span> companies</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
