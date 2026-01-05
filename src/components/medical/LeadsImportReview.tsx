'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ParsedContact {
  company_name: string
  first_name: string
  last_name: string
  email: string
  email_domain: string
  job_title: string
  is_hot: boolean
  attended_conference: boolean
  attended_webinar: boolean
  lifecycle_stage: string | null
  source: string
}

interface ParseSummary {
  totalContacts: number
  uniqueCompanies: number
  hotContacts: number
  conferenceAttendees: number
  webinarAttendees: number
}

interface LeadsImportReviewProps {
  onClose?: () => void
}

export function LeadsImportReview({ onClose }: LeadsImportReviewProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [contacts, setContacts] = useState<ParsedContact[]>([])
  const [summary, setSummary] = useState<ParseSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [appliedResult, setAppliedResult] = useState<{
    created: number
    skipped: number
    skippedAsStakeholder: number
    linkedToTam: number
    linkedToAccountPlan: number
  } | null>(null)
  const [filterHot, setFilterHot] = useState(false)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/medical-import/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse Excel file')
      }

      const data = await response.json()
      setContacts(data.contacts)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleApply = async () => {
    if (contacts.length === 0) return

    setIsApplying(true)
    setError(null)

    try {
      const response = await fetch('/api/medical-import/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          options: {
            skipDuplicates: true,
            linkToAccounts: true,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to import contacts')
      }

      setAppliedResult(data.results)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts')
      console.error(err)
    } finally {
      setIsApplying(false)
    }
  }

  const filteredContacts = filterHot ? contacts.filter(c => c.is_hot) : contacts

  // Success state after applying
  if (appliedResult) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border p-6" style={{ borderColor: 'var(--scout-border)' }}>
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)' }}
          >
            <svg className="w-8 h-8" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Import Complete
          </h3>
          <div className="space-y-1 text-sm mb-6" style={{ color: 'var(--scout-earth)' }}>
            <p>{appliedResult.created} contacts created</p>
            {appliedResult.skipped > 0 && <p>{appliedResult.skipped} duplicates skipped</p>}
            {appliedResult.skippedAsStakeholder > 0 && <p>{appliedResult.skippedAsStakeholder} already exist as stakeholders</p>}
            {appliedResult.linkedToTam > 0 && <p>{appliedResult.linkedToTam} linked to TAM accounts</p>}
            {appliedResult.linkedToAccountPlan > 0 && <p>{appliedResult.linkedToAccountPlan} linked to account plans</p>}
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
          <h3
            className="font-semibold"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Import Leads
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
          Import prospect contacts from Excel files
        </p>
      </div>

      {/* Initial state - no file uploaded */}
      {contacts.length === 0 && !isLoading && (
        <div className="p-6">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--scout-parchment)' }}
            >
              <svg className="w-8 h-8" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
              Upload Leads File
            </h4>
            <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
              Upload your Excel file with prospect contacts
            </p>
          </div>

          <label
            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--scout-border)' }}
          >
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
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center">
          <div
            className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3"
            style={{ borderColor: 'var(--scout-sky)' }}
          />
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Parsing contacts...
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
      {summary && !isLoading && (
        <>
          {/* Summary */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                {summary.totalContacts} Contacts
              </span>
              <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                {summary.uniqueCompanies} Companies
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--scout-clay)' }}>
                {summary.hotContacts} Hot Leads
              </span>
              {summary.conferenceAttendees > 0 && (
                <span className="text-sm" style={{ color: 'var(--scout-sky)' }}>
                  {summary.conferenceAttendees} Conference
                </span>
              )}
              {summary.webinarAttendees > 0 && (
                <span className="text-sm" style={{ color: 'var(--scout-sky)' }}>
                  {summary.webinarAttendees} Webinar
                </span>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--scout-earth)' }}>
              <input
                type="checkbox"
                checked={filterHot}
                onChange={(e) => setFilterHot(e.target.checked)}
                className="w-4 h-4"
              />
              Show only hot leads
            </label>
            <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              Showing {filteredContacts.length} of {contacts.length}
            </span>
          </div>

          {/* Contacts list */}
          <div className="max-h-96 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                No contacts to display
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--scout-border)' }}>
                {filteredContacts.slice(0, 50).map((contact, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {contact.is_hot && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded uppercase font-medium"
                              style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                            >
                              Hot
                            </span>
                          )}
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--scout-earth)' }}>
                            {contact.first_name} {contact.last_name}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                          {contact.job_title} at {contact.company_name}
                        </p>
                        {contact.email && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--scout-sky)' }}>
                            {contact.email}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {contact.attended_conference && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                          >
                            Conf
                          </span>
                        )}
                        {contact.attended_webinar && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                          >
                            Web
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredContacts.length > 50 && (
                  <div className="p-3 text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                    ... and {filteredContacts.length - 50} more contacts
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {contacts.length} contacts ready to import
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
                disabled={contacts.length === 0 || isApplying}
                className="px-4 py-1.5 text-sm rounded text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-sky)' }}
              >
                {isApplying ? 'Importing...' : 'Import All'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
