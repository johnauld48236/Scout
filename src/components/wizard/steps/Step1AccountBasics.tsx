'use client'

import { useState } from 'react'
import { type WizardData } from '../types'

interface Step1Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onCancel: () => void
}

interface CompanySearchResult {
  name: string
  website?: string
  industry?: string
  employeeCount?: string
  headquarters?: string
  description?: string
  confidence: 'high' | 'medium' | 'low'
  confidenceReason?: string
}

const VERTICALS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Manufacturing',
  'Retail',
  'Media & Entertainment',
  'Energy & Utilities',
  'Government',
  'Education',
  'Professional Services',
  'Other',
]

export default function Step1AccountBasics({ data, updateData, onNext, onCancel }: Step1Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<CompanySearchResult | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleCompanySearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const response = await fetch('/api/ai/company-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const result = await response.json()
      if (result.company) {
        setSearchResult(result.company)
      } else {
        setSearchError('No company found. Try a different search term.')
      }
    } catch {
      setSearchError('Search failed. Please try again or enter details manually.')
    } finally {
      setIsSearching(false)
    }
  }

  const acceptSearchResult = () => {
    if (!searchResult) return

    updateData({
      accountName: searchResult.name,
      website: searchResult.website,
      industry: searchResult.industry,
      employeeCount: searchResult.employeeCount,
      headquarters: searchResult.headquarters,
      description: searchResult.description,
    })
    setSearchResult(null)
    setSearchQuery('')
  }

  const rejectSearchResult = () => {
    setSearchResult(null)
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-50 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-zinc-100 text-zinc-600'
    }
  }

  const canProceed = !!data.accountName?.trim()

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Account Basics</h2>
      <p className="text-zinc-500 text-sm mb-4">
        Search for a company or enter details manually.
      </p>

      <div className="space-y-4">
        {/* Company Search */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Search for Company
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompanySearch()}
              placeholder="e.g., Medtronic, Salesforce, Nike..."
              className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleCompanySearch}
              disabled={!searchQuery.trim() || isSearching}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
          {searchError && (
            <p className="mt-2 text-sm text-amber-600">{searchError}</p>
          )}
        </div>

        {/* Search Result Card */}
        {searchResult && (
          <div className={`p-3 rounded-lg border ${getConfidenceColor(searchResult.confidence)}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-zinc-900 font-semibold">{searchResult.name}</h3>
                {searchResult.website && (
                  <p className="text-zinc-500 text-sm">{searchResult.website}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${getConfidenceColor(searchResult.confidence)}`}>
                {searchResult.confidence} confidence
              </span>
            </div>

            {searchResult.description && (
              <p className="text-zinc-600 text-sm mb-2">{searchResult.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mb-2">
              {searchResult.industry && <span>Industry: {searchResult.industry}</span>}
              {searchResult.headquarters && <span>HQ: {searchResult.headquarters}</span>}
              {searchResult.employeeCount && <span>Size: {searchResult.employeeCount}</span>}
            </div>

            {searchResult.confidenceReason && (
              <p className="text-xs text-zinc-400 mb-3 italic">{searchResult.confidenceReason}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={acceptSearchResult}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium"
              >
                Use This Company
              </button>
              <button
                onClick={rejectSearchResult}
                className="px-3 py-1.5 text-zinc-600 hover:text-zinc-900 text-sm"
              >
                Not Right - Search Again
              </button>
            </div>
          </div>
        )}

        {/* Divider - only show if no search result and we have data */}
        {!searchResult && data.accountName && (
          <div className="border-t border-zinc-200 pt-4">
            <p className="text-xs text-zinc-500 mb-3">Company Details</p>
          </div>
        )}

        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Account Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.accountName}
            onChange={(e) => updateData({ accountName: e.target.value })}
            placeholder="Company Name"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Website
          </label>
          <input
            type="text"
            value={data.website || ''}
            onChange={(e) => updateData({ website: e.target.value })}
            placeholder="company.com"
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vertical */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Vertical
            </label>
            <select
              value={data.vertical || ''}
              onChange={(e) => updateData({ vertical: e.target.value })}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select vertical...</option>
              {VERTICALS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={data.industry || ''}
              onChange={(e) => updateData({ industry: e.target.value })}
              placeholder="e.g., Enterprise Software"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Employee Count */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Employee Count
            </label>
            <input
              type="text"
              value={data.employeeCount || ''}
              onChange={(e) => updateData({ employeeCount: e.target.value })}
              placeholder="e.g., 1,000-5,000"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Headquarters */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Headquarters
            </label>
            <input
              type="text"
              value={data.headquarters || ''}
              onChange={(e) => updateData({ headquarters: e.target.value })}
              placeholder="e.g., San Francisco, CA"
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Company Description
          </label>
          <textarea
            value={data.description || ''}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Brief description of what the company does..."
            rows={2}
            className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="px-5 py-2 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          Continue to Research
        </button>
      </div>
    </div>
  )
}
