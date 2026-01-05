'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type RecordType = 'contacts' | 'companies' | 'deals'

interface HubSpotContact {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
}

interface HubSpotCompany {
  id: string
  name: string
  domain: string | null
  industry: string | null
  employee_count: number | null
  city: string | null
  state: string | null
}

interface HubSpotDeal {
  id: string
  name: string
  amount: number | null
  stage: string | null
  close_date: string | null
  currency: string
}

type HubSpotRecord = HubSpotContact | HubSpotCompany | HubSpotDeal

interface HubSpotLookupProps {
  isOpen: boolean
  onClose: () => void
  accountPlanId: string
  accountName: string
  defaultType?: RecordType
  mode?: 'account_plan' | 'tam'  // TAM mode uses different APIs
}

export function HubSpotLookup({
  isOpen,
  onClose,
  accountPlanId,
  accountName,
  defaultType = 'companies',
  mode = 'account_plan',
}: HubSpotLookupProps) {
  const router = useRouter()
  const [recordType, setRecordType] = useState<RecordType>(defaultType)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<HubSpotRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasHubSpot, setHasHubSpot] = useState<boolean | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())

  // Check if HubSpot is configured
  useEffect(() => {
    if (isOpen) {
      checkHubSpotConfig()
      setSelectedContacts(new Set())
      setSuccessMessage(null)
    }
  }, [isOpen])

  const checkHubSpotConfig = async () => {
    try {
      const res = await fetch('/api/integrations/hubspot/config')
      const data = await res.json()
      setHasHubSpot(data.hasToken && data.config?.enabled)
    } catch {
      setHasHubSpot(false)
    }
  }

  // Search with debounce
  const search = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotal(0)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(
        `/api/integrations/hubspot/${recordType}?q=${encodeURIComponent(searchQuery)}&limit=20`
      )
      const data = await res.json()

      if (data.success) {
        setResults(data[recordType] || [])
        setTotal(data.total || 0)
      } else {
        setError(data.error || 'Search failed')
        setResults([])
      }
    } catch {
      setError('Failed to search HubSpot')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, recordType])

  // Debounced search effect
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        search()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, recordType, search, isOpen])

  // Toggle contact selection
  const toggleContactSelect = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Select all contacts
  const selectAllContacts = () => {
    if (selectedContacts.size === results.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(results.map(r => r.id)))
    }
  }

  // Import selected contacts as stakeholders (or TAM contacts)
  const importContacts = async () => {
    if (selectedContacts.size === 0) return

    setIsImporting(true)
    setError(null)

    try {
      const contactsToImport = results.filter(r => selectedContacts.has(r.id)) as HubSpotContact[]

      // Use different API based on mode
      const apiUrl = mode === 'tam'
        ? `/api/tam/${accountPlanId}/contacts`
        : '/api/stakeholders'

      const bodyData = mode === 'tam'
        ? {
            contacts: contactsToImport.map(c => ({
              full_name: c.full_name,
              email: c.email,
              phone: c.phone,
              title: c.title,
              hubspot_contact_id: c.id,
              source: 'hubspot',
            })),
          }
        : {
            account_plan_id: accountPlanId,
            stakeholders: contactsToImport.map(c => ({
              full_name: c.full_name,
              email: c.email,
              phone: c.phone,
              title: c.title,
              company: c.company,
              hubspot_contact_id: c.id,
              source: 'hubspot',
            })),
          }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      })

      const data = await res.json()
      if (data.success || res.ok) {
        const label = mode === 'tam' ? 'contacts' : 'stakeholders'
        setSuccessMessage(`Imported ${selectedContacts.size} contact(s) as ${label}`)
        setSelectedContacts(new Set())
        router.refresh()
      } else {
        setError(data.error || 'Failed to import contacts')
      }
    } catch {
      setError('Failed to import contacts')
    } finally {
      setIsImporting(false)
    }
  }

  // Enrich account with company data
  const enrichWithCompany = async (company: HubSpotCompany) => {
    setIsImporting(true)
    setError(null)

    try {
      // Use different API based on mode
      const apiUrl = mode === 'tam'
        ? `/api/tam/${accountPlanId}`
        : `/api/accounts/${accountPlanId}`

      const res = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: company.industry,
          website: company.domain,
          employee_count: company.employee_count,
          city: company.city,
          state: company.state,
          hubspot_company_id: company.id,
        }),
      })

      if (res.ok) {
        setSuccessMessage(`Enriched account with data from ${company.name}`)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to enrich account')
      }
    } catch {
      setError('Failed to enrich account')
    } finally {
      setIsImporting(false)
    }
  }

  // Import deal as pursuit
  const importDeal = async (deal: HubSpotDeal) => {
    setIsImporting(true)
    setError(null)

    try {
      const res = await fetch('/api/pursuits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_plan_id: accountPlanId,
          name: deal.name,
          estimated_value: deal.amount,
          target_close_date: deal.close_date,
          stage: 'Discovery', // Default stage, would need mapping
          hubspot_deal_id: deal.id,
          source: 'hubspot',
        }),
      })

      const data = await res.json()
      if (data.success || res.ok) {
        setSuccessMessage(`Created pursuit: ${deal.name}`)
        router.refresh()
      } else {
        setError(data.error || 'Failed to import deal')
      }
    } catch {
      setError('Failed to import deal')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#ff7a59' }}
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.41 10.24l-3.83 2.24 3.83 2.24V10.24zm-7.75 4.6l3.83-2.24-3.83-2.24v4.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--scout-earth)' }}>
                HubSpot Lookup
              </h2>
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {accountName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {hasHubSpot === false ? (
          <div className="p-8 text-center">
            <p style={{ color: 'var(--scout-earth-light)' }}>
              HubSpot integration is not configured.
            </p>
            <a
              href="/settings"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              Go to Settings
            </a>
          </div>
        ) : (
          <>
            {/* Type Selector & Search */}
            <div className="p-4 space-y-3" style={{ borderBottom: `1px solid var(--scout-border)` }}>
              {/* Record Type Tabs */}
              <div className="flex gap-2">
                {(['contacts', 'companies', 'deals'] as RecordType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setRecordType(type)
                      setResults([])
                      setSelectedContacts(new Set())
                      setSuccessMessage(null)
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors`}
                    style={{
                      backgroundColor: recordType === type ? 'var(--scout-saddle)' : 'transparent',
                      color: recordType === type ? 'white' : 'var(--scout-earth)',
                      border: recordType === type ? 'none' : '1px solid var(--scout-border)',
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--scout-earth-light)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${recordType}...`}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: 'var(--scout-border)',
                    backgroundColor: 'var(--scout-parchment)',
                    color: 'var(--scout-earth)',
                  }}
                  autoFocus
                />
              </div>

              {/* Hint text */}
              <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                {recordType === 'contacts' && 'Select contacts to import as stakeholders'}
                {recordType === 'companies' && 'Click a company to enrich this account'}
                {recordType === 'deals' && 'Click a deal to create a pursuit'}
              </p>
            </div>

            {/* Messages */}
            {successMessage && (
              <div
                className="mx-4 mt-4 p-3 rounded-lg text-sm flex items-center gap-2"
                style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {successMessage}
              </div>
            )}

            {error && (
              <div
                className="mx-4 mt-4 p-3 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}
              >
                {error}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="animate-spin h-6 w-6"
                    style={{ color: 'var(--scout-saddle)' }}
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--scout-earth-light)' }}>
                  {searchQuery ? 'No results found in HubSpot' : 'Enter a search term to find records'}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Results header with select all for contacts */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                      Showing {results.length} of {total} results
                    </p>
                    {recordType === 'contacts' && results.length > 0 && (
                      <button
                        onClick={selectAllContacts}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--scout-sky)' }}
                      >
                        {selectedContacts.size === results.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {/* Results list */}
                  {results.map((record) => (
                    <div key={record.id}>
                      {recordType === 'contacts' ? (
                        <label
                          className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-blue-300"
                          style={{
                            borderColor: selectedContacts.has(record.id) ? 'var(--scout-sky)' : 'var(--scout-border)',
                            backgroundColor: selectedContacts.has(record.id) ? 'rgba(74, 144, 164, 0.1)' : 'var(--scout-parchment)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(record.id)}
                            onChange={() => toggleContactSelect(record.id)}
                            className="mt-1"
                          />
                          <ContactCard contact={record as HubSpotContact} />
                        </label>
                      ) : (
                        <button
                          onClick={() => {
                            if (recordType === 'companies') {
                              enrichWithCompany(record as HubSpotCompany)
                            } else if (recordType === 'deals') {
                              importDeal(record as HubSpotDeal)
                            }
                          }}
                          disabled={isImporting}
                          className="w-full text-left p-3 rounded-lg border transition-colors hover:border-blue-300 disabled:opacity-50"
                          style={{
                            borderColor: 'var(--scout-border)',
                            backgroundColor: 'var(--scout-parchment)',
                          }}
                        >
                          {recordType === 'companies' && <CompanyCard company={record as HubSpotCompany} />}
                          {recordType === 'deals' && <DealCard deal={record as HubSpotDeal} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with action button for contacts */}
            {recordType === 'contacts' && selectedContacts.size > 0 && (
              <div
                className="p-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {selectedContacts.size} contact(s) selected
                </span>
                <button
                  onClick={importContacts}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-saddle)' }}
                >
                  {isImporting ? 'Importing...' : 'Import as Stakeholders'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ContactCard({ contact }: { contact: HubSpotContact }) {
  return (
    <div className="flex-1">
      <div className="font-medium" style={{ color: 'var(--scout-earth)' }}>
        {contact.full_name}
      </div>
      <div className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
        {contact.title && <span>{contact.title}</span>}
        {contact.title && contact.company && <span> at </span>}
        {contact.company && <span className="font-medium">{contact.company}</span>}
      </div>
      {contact.email && (
        <div className="text-xs mt-1" style={{ color: 'var(--scout-sky)' }}>
          {contact.email}
        </div>
      )}
    </div>
  )
}

function CompanyCard({ company }: { company: HubSpotCompany }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium" style={{ color: 'var(--scout-earth)' }}>
          {company.name}
        </div>
        <div className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          {[company.industry, company.city, company.state].filter(Boolean).join(' • ')}
        </div>
        {company.domain && (
          <div className="text-xs mt-1" style={{ color: 'var(--scout-sky)' }}>
            {company.domain}
          </div>
        )}
      </div>
      <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}>
        Click to Enrich
      </div>
    </div>
  )
}

function DealCard({ deal }: { deal: HubSpotDeal }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium" style={{ color: 'var(--scout-earth)' }}>
          {deal.name}
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--scout-earth-light)' }}>
          {deal.amount && (
            <span className="font-medium" style={{ color: 'var(--scout-trail)' }}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: deal.currency || 'USD',
                maximumFractionDigits: 0,
              }).format(deal.amount)}
            </span>
          )}
          {deal.stage && <span>{deal.stage}</span>}
          {deal.close_date && (
            <span>Close: {new Date(deal.close_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}>
        Click to Import
      </div>
    </div>
  )
}
