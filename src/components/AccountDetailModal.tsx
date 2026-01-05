'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PromoteToAccountPlanModal } from './PromoteToAccountPlanModal'

interface AccountDetailModalProps {
  tamAccountId: string | null
  onClose: () => void
  campaigns: { campaign_id: string; name: string }[]
}

interface AccountData {
  tam_account_id: string
  company_name: string
  website: string | null
  vertical: string
  fit_tier: string | null
  estimated_deal_value: number | null
  company_summary: string | null
  fit_rationale: string | null
  priority_score: number | null
  status: string
}

interface Signal {
  signal_id: string
  signal_type: string
  signal_date: string
  headline: string
  summary: string | null
  source: string | null
}

interface Contact {
  contact_id: string
  full_name: string
  title: string | null
  email: string | null
  linkedin_url: string | null
}

interface WarmPath {
  warm_path_id: string
  connection_name: string
  relationship_type: string | null
  strength: string | null
  notes: string | null
}

function FitTierBadge({ tier }: { tier?: string | null }) {
  const colors: Record<string, string> = {
    'A': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'B': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'C': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  if (!tier) return null
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[tier] || colors['C']}`}>
      Tier {tier}
    </span>
  )
}

function PriorityBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                score >= 60 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                'text-zinc-600 bg-zinc-100 dark:bg-zinc-800'
  return (
    <span className={`px-2 py-1 rounded text-sm font-bold ${color}`}>
      {score}
    </span>
  )
}

function SignalTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'Regulatory_Action': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Leadership_Change': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Product_Launch': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Security_Incident': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Partnership': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Funding_Round': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  }
  const displayName = type?.replace(/_/g, ' ') || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-zinc-100 text-zinc-600'}`}>
      {displayName}
    </span>
  )
}

function formatCurrency(value: number | null): string {
  if (!value) return '-'
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function AccountDetailModal({ tamAccountId, onClose, campaigns }: AccountDetailModalProps) {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [warmPaths, setWarmPaths] = useState<WarmPath[]>([])
  const [loading, setLoading] = useState(false)
  const [showPromoteModal, setShowPromoteModal] = useState(false)

  useEffect(() => {
    if (!tamAccountId) {
      setAccount(null)
      return
    }

    const fetchAccountData = async () => {
      setLoading(true)
      const supabase = createClient()

      // Fetch account details
      const { data: accountData } = await supabase
        .from('tam_accounts')
        .select('*')
        .eq('tam_account_id', tamAccountId)
        .single()

      // Fetch signals
      const { data: signalsData } = await supabase
        .from('account_signals')
        .select('*')
        .eq('tam_account_id', tamAccountId)
        .order('signal_date', { ascending: false })
        .limit(5)

      // Fetch contacts
      const { data: contactsData } = await supabase
        .from('tam_contacts')
        .select('*')
        .eq('tam_account_id', tamAccountId)
        .limit(5)

      // Fetch warm paths
      const { data: warmPathsData } = await supabase
        .from('tam_warm_paths')
        .select('*')
        .eq('tam_account_id', tamAccountId)

      setAccount(accountData)
      setSignals(signalsData || [])
      setContacts(contactsData || [])
      setWarmPaths(warmPathsData || [])
      setLoading(false)
    }

    fetchAccountData()
  }, [tamAccountId])

  if (!tamAccountId) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            ) : (
              <>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {account?.company_name}
                </h2>
                <FitTierBadge tier={account?.fit_tier} />
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
        ) : account ? (
          <div className="p-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Priority</p>
                <PriorityBadge score={account.priority_score || 0} />
              </div>
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Est. Value</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(account.estimated_deal_value)}
                </p>
              </div>
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Contacts</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{contacts.length}</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">Warm Paths</p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{warmPaths.length}</p>
              </div>
            </div>

            {/* Company Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>{account.vertical}</span>
                {account.website && (
                  <>
                    <span>•</span>
                    <a
                      href={`https://${account.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {account.website}
                    </a>
                  </>
                )}
              </div>
              {account.company_summary && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{account.company_summary}</p>
              )}
              {account.fit_rationale && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 italic">{account.fit_rationale}</p>
              )}
            </div>

            {/* Signals */}
            {signals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Recent Signals</h3>
                <div className="space-y-2">
                  {signals.map((signal, index) => (
                    <div key={signal.signal_id || index} className="border-l-2 border-blue-500 pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <SignalTypeBadge type={signal.signal_type} />
                        <span className="text-xs text-zinc-500">
                          {new Date(signal.signal_date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{signal.headline}</p>
                      {signal.summary && (
                        <p className="text-sm text-zinc-500 mt-0.5">{signal.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {contacts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Key Contacts</h3>
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <div key={contact.contact_id || index} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{contact.full_name}</p>
                        {contact.title && (
                          <p className="text-xs text-zinc-500">{contact.title}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-700">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </a>
                        )}
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url.startsWith('http') ? contact.linkedin_url : `https://${contact.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warm Paths */}
            {warmPaths.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Warm Paths</h3>
                <div className="space-y-2">
                  {warmPaths.map((path, index) => (
                    <div key={path.warm_path_id || index} className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{path.connection_name}</p>
                        {path.strength && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            path.strength === 'strong' ? 'bg-green-100 text-green-700' :
                            path.strength === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {path.strength}
                          </span>
                        )}
                      </div>
                      {path.relationship_type && (
                        <p className="text-xs text-zinc-500">{path.relationship_type}</p>
                      )}
                      {path.notes && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{path.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 -mx-6 px-6">
              <button
                onClick={() => setShowPromoteModal(true)}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Start Account Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-zinc-500">
            Account not found
          </div>
        )}
      </div>

      {/* Promote Modal */}
      {showPromoteModal && account && (
        <PromoteToAccountPlanModal
          tamAccount={{
            tam_account_id: account.tam_account_id,
            company_name: account.company_name,
            vertical: account.vertical,
            estimated_deal_value: account.estimated_deal_value || 0,
            fit_tier: account.fit_tier || '',
          }}
          campaigns={campaigns}
          onClose={() => setShowPromoteModal(false)}
          onSuccess={() => {
            setShowPromoteModal(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
