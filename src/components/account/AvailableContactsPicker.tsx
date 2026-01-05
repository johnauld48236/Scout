'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProspectContact {
  contact_id: string
  company_name: string
  first_name: string
  last_name: string
  email: string
  job_title: string
  is_hot: boolean
  linkedin_url: string | null
}

interface AvailableContactsPickerProps {
  accountPlanId: string
  onClose: () => void
}

export function AvailableContactsPicker({ accountPlanId, onClose }: AvailableContactsPickerProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<ProspectContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [promoting, setPromoting] = useState<string | null>(null)
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    loadContacts()
  }, [accountPlanId])

  const loadContacts = async () => {
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/available-contacts`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data.contacts || [])
        setAccountName(data.accountName || '')
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromote = async (contact: ProspectContact) => {
    setPromoting(contact.contact_id)
    try {
      const response = await fetch(`/api/accounts/${accountPlanId}/available-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contact.contact_id }),
      })

      if (response.ok) {
        // Remove from list and refresh
        setContacts(contacts.filter(c => c.contact_id !== contact.contact_id))
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to promote contact:', error)
    } finally {
      setPromoting(null)
    }
  }

  const filteredContacts = search
    ? contacts.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        c.job_title?.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border" style={{ borderColor: 'var(--scout-border)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-semibold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Available Contacts
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
              Imported contacts matching {accountName || 'this account'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <svg className="w-5 h-5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--scout-border)' }}>
        <input
          type="text"
          placeholder="Search by name, title, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg"
          style={{ borderColor: 'var(--scout-border)' }}
        />
      </div>

      {/* Contacts List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>
            Loading contacts...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {contacts.length === 0
                ? 'No imported contacts found for this account.'
                : 'No contacts match your search.'}
            </p>
            {contacts.length === 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>
                Import leads in Settings to see available contacts here.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--scout-border)' }}>
            {filteredContacts.map((contact) => (
              <div
                key={contact.contact_id}
                className="p-3 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {contact.is_hot && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}
                      >
                        Hot
                      </span>
                    )}
                    <span className="text-sm font-medium" style={{ color: 'var(--scout-earth)' }}>
                      {contact.first_name} {contact.last_name}
                    </span>
                  </div>
                  {contact.job_title && (
                    <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                      {contact.job_title}
                    </p>
                  )}
                  {contact.email && (
                    <p className="text-xs truncate" style={{ color: 'var(--scout-sky)' }}>
                      {contact.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handlePromote(contact)}
                  disabled={promoting === contact.contact_id}
                  className="ml-2 px-3 py-1.5 text-xs rounded text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--scout-trail)' }}
                >
                  {promoting === contact.contact_id ? 'Adding...' : 'Add as Stakeholder'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredContacts.length > 0 && (
        <div className="p-3 border-t text-xs text-center" style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}>
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  )
}
