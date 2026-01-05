'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HubSpotLookup } from '@/components/integrations/HubSpotLookup'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import { EnrichmentWizardModal } from '@/components/enrichment/EnrichmentWizardModal'
import { EnrichmentStatusBadge } from '@/components/tam/EnrichmentStatusBadge'

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
  // Enrichment fields
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

interface Signal {
  signal_id: string
  signal_type: string
  signal_date: string
  summary: string
  source?: string
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
  signals: Signal[]
  warmPaths: WarmPath[]
  allCampaigns: Campaign[]
  hasHubSpot: boolean
}

export function TAMDetailClient({
  account,
  campaignFits,
  contacts,
  signals,
  warmPaths,
  allCampaigns,
  hasHubSpot,
}: TAMDetailClientProps) {
  const router = useRouter()
  const [showHubSpotLookup, setShowHubSpotLookup] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'crm' | 'contacts'>('overview')
  const [isEnriching, setIsEnriching] = useState(false)

  // Get initial campaign IDs from campaign fits
  const initialCampaignIds = campaignFits.map(fit => fit.campaigns.campaign_id)

  async function handleEnrich() {
    setIsEnriching(true)
    try {
      const res = await fetch(`/api/tam/${account.tam_account_id}/enrich`, { method: 'POST' })
      const { error } = await res.json()
      if (error) {
        alert(`Enrichment failed: ${error}`)
      } else {
        router.refresh()
      }
    } catch {
      alert('Enrichment failed')
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/tam" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
          ← Back to TAM
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PriorityScore score={account.priority_score || 0} />
            {['Qualified', 'Researching', 'Pursuing'].includes(account.status) && (
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
                  boxShadow: '0 2px 8px rgba(139, 69, 19, 0.3)',
                }}
              >
                <ScoutAIIcon size={18} className="text-white" />
                Build Account Plan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label="Est. Value" value={`$${(account.estimated_deal_value || 0).toLocaleString()}`} />
        <MetricCard label="Contacts" value={contacts.length.toString()} />
        <MetricCard label="Signals" value={signals.length.toString()} />
        <MetricCard label="Warm Paths" value={warmPaths.length.toString()} />
      </div>

      {/* Action Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 border-b" style={{ borderColor: 'var(--scout-border)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-current text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Overview
            </span>
          </button>
          {hasHubSpot && (
            <button
              onClick={() => setActiveTab('crm')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'crm'
                  ? 'border-current text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.41 10.24l-3.83 2.24 3.83 2.24V10.24zm-7.75 4.6l3.83-2.24-3.83-2.24v4.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
                CRM Data
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'contacts'
                ? 'border-current text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              Contacts ({contacts.length})
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Quick Actions Banner */}
              <section
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: 'var(--scout-parchment)',
                  borderColor: 'var(--scout-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--scout-saddle)' }}
                    >
                      <ScoutAIIcon size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">Ready to promote this account?</h3>
                      <p className="text-sm text-zinc-500">
                        Use Scout AI to research, enrich structure, and build a complete account plan.
                      </p>
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
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Build Account Plan
                  </button>
                </div>
              </section>

              {/* Overview Section */}
              <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Overview</h2>

                {account.company_summary && (
                  <div className="mb-4">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Company Summary</p>
                    <p className="text-zinc-700 dark:text-zinc-300">{account.company_summary}</p>
                  </div>
                )}

                {account.fit_rationale && (
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Fit Rationale</p>
                    <p className="text-zinc-700 dark:text-zinc-300">{account.fit_rationale}</p>
                  </div>
                )}

                {!account.company_summary && !account.fit_rationale && (
                  <p className="text-zinc-500 text-sm">No overview information available. Click Build Account Plan to gather intelligence.</p>
                )}
              </section>

              {/* Enrichment Data */}
              <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Enrichment</h2>
                    <EnrichmentStatusBadge status={account.enrichment_status} />
                  </div>
                  <button
                    onClick={handleEnrich}
                    disabled={isEnriching}
                    className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                    style={{
                      backgroundColor: account.enrichment_status === 'enriched' ? 'var(--scout-parchment)' : 'var(--scout-sky)',
                      color: account.enrichment_status === 'enriched' ? 'var(--scout-earth)' : 'white'
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
                      'Enrich with AI'
                    )}
                  </button>
                </div>

                {account.enrichment_status === 'enriched' ? (
                  <div className="space-y-4">
                    {account.products_overview && (
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Products Overview</p>
                        <p className="text-zinc-700 dark:text-zinc-300">{account.products_overview}</p>
                      </div>
                    )}

                    {account.operating_regions && account.operating_regions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Operating Regions</p>
                        <div className="flex flex-wrap gap-2">
                          {account.operating_regions.map((region) => (
                            <span
                              key={region}
                              className="px-2 py-1 text-xs rounded-full"
                              style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}
                            >
                              {region}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.regulatory_exposure && account.regulatory_exposure.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Regulatory Exposure</p>
                        <div className="flex flex-wrap gap-2">
                          {account.regulatory_exposure.map((reg) => (
                            <span
                              key={reg}
                              className="px-2 py-1 text-xs rounded-full"
                              style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}
                            >
                              {reg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {account.enriched_at && (
                      <p className="text-xs text-zinc-400 mt-2">
                        Last enriched: {new Date(account.enriched_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : account.enrichment_status === 'failed' ? (
                  <p className="text-sm text-red-600">
                    Enrichment failed. Click the button above to try again.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Click &ldquo;Enrich with AI&rdquo; to gather operating regions, products overview, and regulatory exposure data.
                  </p>
                )}
              </section>

              {/* Campaign Fits */}
              <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Campaign Fit ({campaignFits.length})</h2>

                <div className="space-y-3">
                  {campaignFits.map((fit, index) => (
                    <Link
                      key={fit.campaign_tam_account_id || index}
                      href={`/campaigns/${fit.campaigns.campaign_id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{fit.campaigns.name}</p>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            fit.campaigns.type === 'vertical' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {fit.campaigns.type}
                          </span>
                        </div>
                        {fit.fit_rationale && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{fit.fit_rationale}</p>
                        )}
                      </div>
                      <span className={`text-lg font-bold ${
                        fit.fit_score >= 80 ? 'text-green-600' :
                        fit.fit_score >= 60 ? 'text-yellow-600' : 'text-zinc-500'
                      }`}>
                        {fit.fit_score}/100
                      </span>
                    </Link>
                  ))}
                  {campaignFits.length === 0 && (
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No campaign fits scored</p>
                  )}
                </div>
              </section>
            </>
          )}

          {/* CRM Data Tab */}
          {activeTab === 'crm' && hasHubSpot && (
            <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">CRM Data (HubSpot)</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Search HubSpot to find contacts, company data, and deals associated with {account.company_name}.
              </p>

              <button
                onClick={() => setShowHubSpotLookup(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2"
                style={{
                  borderColor: '#ff7a59',
                  color: '#ff7a59',
                  backgroundColor: 'transparent',
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.41 10.24l-3.83 2.24 3.83 2.24V10.24zm-7.75 4.6l3.83-2.24-3.83-2.24v4.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
                Search HubSpot
              </button>

              <HubSpotLookup
                isOpen={showHubSpotLookup}
                onClose={() => setShowHubSpotLookup(false)}
                accountPlanId={account.tam_account_id}
                accountName={account.company_name}
                defaultType="companies"
                mode="tam"
              />
            </section>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Contacts ({contacts.length})</h2>
                {hasHubSpot && (
                  <button
                    onClick={() => {
                      setActiveTab('crm')
                      setShowHubSpotLookup(true)
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Import from HubSpot
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div key={contact.contact_id} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{contact.full_name}</p>
                        {contact.title && (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{contact.title}</p>
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
                    {contact.notes && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{contact.notes}</p>
                    )}
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">No contacts added</p>
                    {hasHubSpot && (
                      <button
                        onClick={() => {
                          setActiveTab('crm')
                          setShowHubSpotLookup(true)
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Import from HubSpot
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Warm Paths */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Warm Paths ({warmPaths.length})</h2>

            <div className="space-y-3">
              {warmPaths.map((path, index) => (
                <div key={path.warm_path_id || index} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{path.connection_name}</p>
                    <ConnectionStrengthBadge strength={path.strength} />
                  </div>
                  {path.relationship_type && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{path.relationship_type}</p>
                  )}
                  {path.notes && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{path.notes}</p>
                  )}
                </div>
              ))}
              {warmPaths.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No warm paths identified</p>
              )}
            </div>
          </section>

          {/* Signals */}
          <section className="rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Signals ({signals.length})</h2>

            <div className="space-y-3">
              {signals.map((signal, index) => (
                <div key={signal.signal_id || index} className="border-l-2 border-blue-500 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SignalTypeBadge type={signal.signal_type} />
                    <span className="text-xs text-zinc-500">{new Date(signal.signal_date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{signal.summary}</p>
                  {signal.source && (
                    <p className="text-xs text-zinc-500 mt-1">Source: {signal.source}</p>
                  )}
                </div>
              ))}
              {signals.length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No signals recorded</p>
              )}
            </div>
          </section>
        </div>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</p>
    </div>
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
    'MA_Activity': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Hiring_Surge': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }
  const displayName = type?.replace(/_/g, ' ') || 'Unknown'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-zinc-100 text-zinc-600'}`}>
      {displayName}
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

