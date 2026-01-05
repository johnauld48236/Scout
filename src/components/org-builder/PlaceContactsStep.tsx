'use client'

import { useState } from 'react'
import { BusinessUnit, ContactToPlace } from './OrgBuilderWizard'
import { SALES_METHODOLOGIES, SalesMethodologyType } from '@/lib/ai/context/company-profile'

interface Account {
  account_name: string
}

interface PlaceContactsStepProps {
  account: Account
  contacts: ContactToPlace[]
  businessUnits: BusinessUnit[]
  methodology: SalesMethodologyType
  onUpdateContacts: (contacts: ContactToPlace[]) => void
}

const ROLE_TYPES = [
  { value: 'Economic_Buyer', label: 'Economic Buyer', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'Technical_Buyer', label: 'Technical Buyer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'Champion', label: 'Champion', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'Influencer', label: 'Influencer', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'Blocker', label: 'Blocker', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'Coach', label: 'Coach', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'End_User', label: 'End User', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' },
]

const SENTIMENTS = [
  { value: 'Strong_Advocate', label: 'Strong Advocate', color: 'bg-green-500' },
  { value: 'Supportive', label: 'Supportive', color: 'bg-green-400' },
  { value: 'Neutral', label: 'Neutral', color: 'bg-zinc-400' },
  { value: 'Skeptical', label: 'Skeptical', color: 'bg-yellow-500' },
  { value: 'Opponent', label: 'Opponent', color: 'bg-red-500' },
  { value: 'Unknown', label: 'Unknown', color: 'bg-zinc-300' },
]

export function PlaceContactsStep({
  account,
  contacts,
  businessUnits,
  methodology,
  onUpdateContacts,
}: PlaceContactsStepProps) {
  const [filter, setFilter] = useState<'all' | 'unplaced' | 'placed'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const methodologyInfo = SALES_METHODOLOGIES[methodology]

  // Get methodology-relevant role suggestions
  const getRelevantRoles = (): string[] => {
    if (methodology === 'MEDDICC' || methodology === 'MEDDPICC') {
      return ['Economic_Buyer', 'Champion', 'Technical_Buyer', 'Influencer']
    }
    if (methodology === 'BANT') {
      return ['Economic_Buyer', 'Technical_Buyer', 'Influencer', 'End_User']
    }
    return ['Champion', 'Influencer', 'Technical_Buyer']
  }

  const relevantRoles = getRelevantRoles()

  const filteredContacts = contacts.filter(c => {
    if (filter === 'unplaced') return !c.placed
    if (filter === 'placed') return c.placed
    return true
  })

  const unplacedFromResearch = contacts.filter(c => c.source === 'research' && !c.placed)

  const updateContact = (id: string, updates: Partial<ContactToPlace>) => {
    onUpdateContacts(
      contacts.map(c => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const togglePlaced = (id: string) => {
    const contact = contacts.find(c => c.id === id)
    if (contact) {
      updateContact(id, { placed: !contact.placed })
    }
  }

  const quickAssignRole = (id: string, roleType: string) => {
    updateContact(id, { roleType, placed: true })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Place Contacts
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Review and tag contacts for {account.account_name}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {(['all', 'unplaced', 'placed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white dark:bg-zinc-900 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {f === 'all' ? `All (${contacts.length})` :
               f === 'unplaced' ? `To Review (${contacts.filter(c => !c.placed).length})` :
               `Placed (${contacts.filter(c => c.placed).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Methodology-specific prompt */}
      {unplacedFromResearch.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{unplacedFromResearch.length} contacts</strong> from research need review.
            For {methodologyInfo.name}, look for: {relevantRoles.map(r => r.replace('_', ' ')).join(', ')}.
          </p>
        </div>
      )}

      {/* Contact cards */}
      <div className="space-y-3">
        {filteredContacts.map(contact => {
          const isExpanded = expandedId === contact.id
          const roleInfo = ROLE_TYPES.find(r => r.value === contact.roleType)

          return (
            <div
              key={contact.id}
              className={`rounded-lg border transition-all ${
                contact.placed
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => togglePlaced(contact.id)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    contact.placed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-green-400'
                  }`}
                >
                  {contact.placed && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Contact info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {contact.name}
                    </span>
                    {contact.source === 'research' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded">
                        from research
                      </span>
                    )}
                    {contact.confidence && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        contact.confidence === 'high' ? 'bg-green-100 text-green-700' :
                        contact.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-zinc-100 text-zinc-600'
                      }`}>
                        {contact.confidence}
                      </span>
                    )}
                  </div>
                  {contact.title && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {contact.title}
                    </p>
                  )}
                </div>

                {/* Quick role assign */}
                <div className="flex items-center gap-2">
                  {roleInfo ? (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {relevantRoles.slice(0, 3).map(role => {
                        const info = ROLE_TYPES.find(r => r.value === role)
                        return (
                          <button
                            key={role}
                            onClick={() => quickAssignRole(contact.id, role)}
                            className={`text-xs px-2 py-1 rounded font-medium opacity-60 hover:opacity-100 transition-opacity ${info?.color}`}
                            title={`Assign as ${info?.label}`}
                          >
                            {info?.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Role */}
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Role</label>
                      <div className="flex flex-wrap gap-1">
                        {ROLE_TYPES.map(role => (
                          <button
                            key={role.value}
                            onClick={() => updateContact(contact.id, { roleType: role.value })}
                            className={`text-xs px-2 py-1 rounded font-medium transition-all ${
                              contact.roleType === role.value
                                ? role.color
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sentiment */}
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Sentiment</label>
                      <div className="flex flex-wrap gap-1">
                        {SENTIMENTS.map(sentiment => (
                          <button
                            key={sentiment.value}
                            onClick={() => updateContact(contact.id, { sentiment: sentiment.value })}
                            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-all ${
                              contact.sentiment === sentiment.value
                                ? 'bg-zinc-200 dark:bg-zinc-700 ring-2 ring-blue-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${sentiment.color}`} />
                            {sentiment.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Business Unit */}
                    <div>
                      <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Business Unit</label>
                      <div className="flex flex-wrap gap-1">
                        {businessUnits.map(unit => (
                          <button
                            key={unit.id}
                            onClick={() => updateContact(contact.id, { businessUnitId: unit.id })}
                            className={`text-xs px-2 py-1 rounded transition-all ${
                              contact.businessUnitId === unit.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {unit.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filteredContacts.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            {filter === 'unplaced' ? 'All contacts have been reviewed!' : 'No contacts yet.'}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">
              <strong className="text-zinc-900 dark:text-zinc-100">{contacts.filter(c => c.placed).length}</strong> contacts placed
            </span>
            {contacts.filter(c => c.roleType).length > 0 && (
              <span className="text-zinc-500">
                <strong className="text-zinc-900 dark:text-zinc-100">{contacts.filter(c => c.roleType).length}</strong> roles assigned
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {relevantRoles.map(role => {
              const count = contacts.filter(c => c.roleType === role).length
              const info = ROLE_TYPES.find(r => r.value === role)
              return (
                <span
                  key={role}
                  className={`text-xs px-2 py-1 rounded ${
                    count > 0 ? info?.color : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {info?.label}: {count}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
