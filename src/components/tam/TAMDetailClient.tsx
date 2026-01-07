'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import { EnrichmentWizardModal } from '@/components/enrichment/EnrichmentWizardModal'

interface TAMAccount {
  tam_account_id: string
  company_name: string
  website?: string
  vertical: string
  fit_tier: string
  status: string
  priority_score?: number
  estimated_deal_value: number
  company_summary?: string
  fit_rationale?: string
  industry?: string
  employee_count?: number
  annual_revenue?: number
  headquarters?: string
  notes?: string
  operating_regions?: string[] | null
  products_overview?: string | null
  regulatory_exposure?: string[] | null
  enrichment_status?: 'pending' | 'enriched' | 'failed' | null
  enriched_at?: string | null
}

interface Campaign {
  campaign_id: string
  name: string
  type: string
  status?: string
  value_proposition?: string
  key_pain_points?: string
  regulatory_context?: string
  signal_triggers?: string
  target_verticals?: string[]
}

interface CampaignFit {
  campaign_tam_account_id: string
  fit_score: number
  fit_rationale: string
  campaigns: { campaign_id: string; name: string; type: string }
}

interface Contact {
  contact_id: string
  full_name: string
  title?: string
  email?: string
  linkedin_url?: string
  notes?: string
}

interface IntelligenceSignal {
  signal_id: string
  title: string
  summary?: string
  signal_type: string
  signal_date?: string
  confidence: string
  regulations_matched?: string[]
  company_mentioned?: string
}

interface WarmPath {
  warm_path_id: string
  connection_name: string
  relationship_type?: string
  strength: string
  notes?: string
}

interface TAMDetailClientProps {
  account: TAMAccount
  campaignFits: CampaignFit[]
  contacts: Contact[]
  warmPaths: WarmPath[]
  allCampaigns: Campaign[]
  hasHubSpot: boolean
  accountSignals: IntelligenceSignal[]
  verticalSignals: IntelligenceSignal[]
  useScoutTerminology?: boolean  // Use Scout terminology (Landscape instead of TAM)
}

export function TAMDetailClient({
  account,
  campaignFits,
  contacts,
  warmPaths,
  allCampaigns,
  accountSignals,
  verticalSignals,
  useScoutTerminology = false,
}: TAMDetailClientProps) {
  // Scout terminology labels
  const labels = useScoutTerminology ? {
    pageType: 'Landscape',
    backLink: '/landscape',
    backText: 'Landscape',
    createButton: 'Establish Territory',
  } : {
    pageType: 'TAM',
    backLink: '/tam',
    backText: 'TAM',
    createButton: 'Create Account Plan',
  }
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [notes, setNotes] = useState(account.notes || '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesChanged, setNotesChanged] = useState(false)

  // Get initial campaign IDs from campaign fits
  const initialCampaignIds = campaignFits.map(fit => fit.campaigns.campaign_id)

  // Auto-enrich on first visit if not already enriched
  useEffect(() => {
    if (!account.enrichment_status || account.enrichment_status === 'pending') {
      handleEnrich()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEnrich() {
    setIsEnriching(true)
    try {
      const res = await fetch(`/api/tam/${account.tam_account_id}/enrich`, { method: 'POST' })
      const { error } = await res.json()
      if (error) {
        console.error('Enrichment failed:', error)
      } else {
        router.refresh()
      }
    } catch {
      console.error('Enrichment failed')
    } finally {
      setIsEnriching(false)
    }
  }

  async function handleSaveNotes() {
    setIsSavingNotes(true)
    try {
      const res = await fetch(`/api/tam/${account.tam_account_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (res.ok) {
        setNotesChanged(false)
      }
    } catch {
      console.error('Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const allSignals = [...accountSignals, ...verticalSignals]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={labels.backLink} className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
          ← Back to {labels.backText}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{account.company_name}</h1>
              <FitTierBadge tier={account.fit_tier} />
              <StatusBadge status={account.status} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-zinc-500 dark:text-zinc-400">
              <span>{account.vertical}</span>
              {account.website && (
                <>
                  <span>•</span>
                  <a href={`https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {account.website}
                  </a>
                </>
              )}
              {account.estimated_deal_value > 0 && (
                <>
                  <span>•</span>
                  <span className="font-medium">${account.estimated_deal_value.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
          <PriorityScore score={account.priority_score || 0} />
        </div>
      </div>

      {/* Step Flow Cards */}
      <div className="space-y-4 mb-8">
        {/* Step 1: Quick Enrich */}
        <section className="rounded-lg border-2 border-dashed p-5 transition-all" style={{
          borderColor: account.enrichment_status === 'enriched' ? 'var(--scout-sage)' : 'var(--scout-sky)',
          backgroundColor: account.enrichment_status === 'enriched' ? 'rgba(107, 142, 35, 0.05)' : 'rgba(56, 152, 199, 0.05)',
        }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                account.enrichment_status === 'enriched' ? 'bg-green-600' : 'bg-blue-600'
              }`}>
                {account.enrichment_status === 'enriched' ? '✓' : '1'}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {account.enrichment_status === 'enriched' ? 'Account Enriched' : 'Quick Enrich'}
                </h3>
                <p className="text-sm text-zinc-500">
                  {account.enrichment_status === 'enriched'
                    ? 'Company basics, products, and regulatory exposure gathered'
                    : 'Get company basics, products, and regulatory exposure'}
                </p>
              </div>
            </div>
            <button
              onClick={handleEnrich}
              disabled={isEnriching}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: account.enrichment_status === 'enriched' ? 'transparent' : 'var(--scout-sky)',
                color: account.enrichment_status === 'enriched' ? 'var(--scout-sky)' : 'white',
                border: account.enrichment_status === 'enriched' ? '1px solid var(--scout-sky)' : 'none',
              }}
            >
              {isEnriching ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enriching...
                </>
              ) : account.enrichment_status === 'enriched' ? (
                'Re-enrich'
              ) : (
                <>
                  <ScoutAIIcon size={16} className="text-white" />
                  Enrich with AI
                </>
              )}
            </button>
          </div>

          {/* Enrichment Results */}
          {account.enrichment_status === 'enriched' && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              {account.products_overview && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Products</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3">{account.products_overview}</p>
                </div>
              )}
              {account.operating_regions && account.operating_regions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Regions</p>
                  <div className="flex flex-wrap gap-1">
                    {account.operating_regions.map(region => (
                      <span key={region} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {region}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {account.regulatory_exposure && account.regulatory_exposure.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Regulations</p>
                  <div className="flex flex-wrap gap-1">
                    {account.regulatory_exposure.map(reg => (
                      <span key={reg} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {account.enriched_at && (
            <p className="text-xs text-zinc-400 mt-3">Last enriched: {new Date(account.enriched_at).toLocaleString()}</p>
          )}
        </section>

        {/* Step 2: Establish Territory / Build Account Plan */}
        <section className="rounded-lg border p-5" style={{
          borderColor: 'var(--scout-border)',
          backgroundColor: 'var(--scout-parchment)',
        }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'var(--scout-saddle)' }}>
                2
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{labels.createButton}</h3>
                <p className="text-sm text-zinc-500">Create a full territory with compass, trails, and strategy</p>
              </div>
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)',
              }}
            >
              <ScoutAIIcon size={18} className="text-white" />
              {labels.createButton}
            </button>
          </div>
        </section>
      </div>

      {/* Why This Account + Notes Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Why This Account */}
        <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Why This Account?</h2>

          {/* Campaign Fit */}
          {campaignFits.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Campaign Fit</p>
              <div className="space-y-2">
                {campaignFits.slice(0, 3).map((fit, index) => (
                  <Link
                    key={fit.campaign_tam_account_id || index}
                    href={`/campaigns/${fit.campaigns.campaign_id}`}
                    className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        fit.fit_score >= 80 ? 'bg-green-500' : fit.fit_score >= 60 ? 'bg-yellow-500' : 'bg-zinc-400'
                      }`} />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{fit.campaigns.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      fit.fit_score >= 80 ? 'text-green-600' : fit.fit_score >= 60 ? 'text-yellow-600' : 'text-zinc-500'
                    }`}>{fit.fit_score}/100</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Intelligence Signals */}
          {allSignals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Intelligence Signals</p>
              <div className="space-y-2">
                {allSignals.slice(0, 4).map((signal, index) => (
                  <div key={signal.signal_id || index} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                      <SignalTypeBadge type={signal.signal_type} />
                      <ConfidenceBadge confidence={signal.confidence} />
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">{signal.title}</p>
                    {signal.company_mentioned && !accountSignals.includes(signal) && (
                      <p className="text-xs text-zinc-500 mt-1">Re: {signal.company_mentioned}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaignFits.length === 0 && allSignals.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-4">
              No campaign fits or signals yet. Run intelligence scan from TAM Overview.
            </p>
          )}
        </section>

        {/* Notes */}
        <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
            {notesChanged && (
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
              >
                {isSavingNotes ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesChanged(true)
            }}
            placeholder="Add notes about this account... These will persist to the account plan."
            className="w-full h-40 p-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-400 mt-2">Notes persist to the account plan when promoted</p>
        </section>
      </div>

      {/* Bottom Row: Company Basics, Contacts, Warm Paths */}
      <div className="grid grid-cols-3 gap-6">
        {/* Company Basics */}
        <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Company Basics</h2>
          <div className="space-y-3">
            {account.industry && (
              <div>
                <p className="text-xs text-zinc-500">Industry</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{account.industry}</p>
              </div>
            )}
            {account.employee_count && (
              <div>
                <p className="text-xs text-zinc-500">Employees</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{account.employee_count.toLocaleString()}</p>
              </div>
            )}
            {account.headquarters && (
              <div>
                <p className="text-xs text-zinc-500">Headquarters</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{account.headquarters}</p>
              </div>
            )}
            {account.annual_revenue && (
              <div>
                <p className="text-xs text-zinc-500">Annual Revenue</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">${account.annual_revenue.toLocaleString()}</p>
              </div>
            )}
            {account.company_summary && (
              <div>
                <p className="text-xs text-zinc-500">Summary</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{account.company_summary}</p>
              </div>
            )}
            {!account.industry && !account.employee_count && !account.headquarters && !account.company_summary && (
              <p className="text-sm text-zinc-500 text-center py-2">
                {account.enrichment_status === 'enriched' ? 'Limited data available' : 'Enrich to get company basics'}
              </p>
            )}
          </div>
        </section>

        {/* Contacts */}
        <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Contacts ({contacts.length})</h2>
          <div className="space-y-3">
            {contacts.slice(0, 4).map((contact) => (
              <div key={contact.contact_id} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{contact.full_name}</p>
                {contact.title && (
                  <p className="text-xs text-zinc-500">{contact.title}</p>
                )}
                <div className="flex gap-2 mt-1">
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
            {contacts.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No contacts yet</p>
            )}
            {contacts.length > 4 && (
              <p className="text-xs text-zinc-500 text-center">+{contacts.length - 4} more</p>
            )}
          </div>
        </section>

        {/* Warm Paths */}
        <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Warm Paths ({warmPaths.length})</h2>
          <div className="space-y-3">
            {warmPaths.map((path, index) => (
              <div key={path.warm_path_id || index} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{path.connection_name}</p>
                  <ConnectionStrengthBadge strength={path.strength} />
                </div>
                {path.relationship_type && (
                  <p className="text-xs text-zinc-500">{path.relationship_type}</p>
                )}
                {path.notes && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{path.notes}</p>
                )}
              </div>
            ))}
            {warmPaths.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No warm paths identified</p>
            )}
          </div>
        </section>
      </div>

      {/* Enrichment Wizard Modal */}
      <EnrichmentWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        accountId={account.tam_account_id}
        accountType="tam"
        initialData={{
          company_name: account.company_name,
          website: account.website,
          industry: account.industry,
          vertical: account.vertical,
          employee_count: account.employee_count,
          headquarters: account.headquarters,
          company_summary: account.company_summary,
        }}
        campaigns={allCampaigns}
        initialCampaignIds={initialCampaignIds}
      />
    </div>
  )
}

// Helper Components
function FitTierBadge({ tier }: { tier?: string }) {
  const colors: Record<string, string> = {
    'A': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'B': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'C': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`px-3 py-1 rounded text-sm font-medium ${colors[tier || 'C']}`}>
      Tier {tier || '?'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      ['Qualified', 'Researching', 'Pursuing'].includes(status) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
      status === 'Converted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
    }`}>
      {status}
    </span>
  )
}

function PriorityScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :
                score >= 60 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                'text-zinc-600 bg-zinc-100 dark:bg-zinc-800'
  return (
    <div className={`px-4 py-2 rounded-lg ${color}`}>
      <p className="text-xs uppercase tracking-wide opacity-75">Priority</p>
      <p className="text-3xl font-bold">{score}</p>
    </div>
  )
}

function SignalTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    'regulatory_action': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'security_incident': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'hiring': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    'news_mention': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'compliance_issue': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }
  const displayName = type?.replace(/_/g, ' ') || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[type] || 'bg-zinc-100 text-zinc-600'}`}>
      {displayName}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const color = confidence === 'high' ? 'text-green-600 dark:text-green-400' :
                confidence === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-zinc-500 dark:text-zinc-400'
  return (
    <span className={`text-xs ${color}`}>
      {confidence}
    </span>
  )
}

function ConnectionStrengthBadge({ strength }: { strength: string }) {
  const colors: Record<string, string> = {
    'strong': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'weak': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[strength] || colors['weak']}`}>
      {strength}
    </span>
  )
}
