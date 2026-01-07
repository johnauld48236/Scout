'use client'

import Link from 'next/link'

interface IntelligenceSummaryProps {
  // TAM Intelligence metrics
  tamAccountCount: number
  highPriorityCount: number
  recentSignals: number
  estimatedOpportunity: number
  // Account Plan metrics
  activeAccountPlans: number
  accountsNeedingAttention: number
  openPursuits: number
  // Gap context
  newBusinessGap: number
  upsellGap: number
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

export function IntelligenceSummary({
  tamAccountCount,
  highPriorityCount,
  recentSignals,
  estimatedOpportunity,
  activeAccountPlans,
  accountsNeedingAttention,
  openPursuits,
  newBusinessGap,
  upsellGap
}: IntelligenceSummaryProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Filling the Gap
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* TAM Intelligence - For New Business */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">TAM Intelligence</span>
            </div>
            {newBusinessGap > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                Gap: {formatCurrency(newBusinessGap)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{tamAccountCount.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">TAM</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600">{highPriorityCount}</p>
              <p className="text-[10px] text-gray-500">High Pri</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{recentSignals}</p>
              <p className="text-[10px] text-gray-500">Signals</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(estimatedOpportunity)}</p>
              <p className="text-[10px] text-gray-500">Est. Opp</p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t">
            <Link href="/tam/list" className="text-xs font-medium text-blue-600">
              Explore TAM accounts →
            </Link>
          </div>
        </div>

        {/* Account Plans - For Upsell/Renewal */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900">Account Plans</span>
            </div>
            {upsellGap > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
                Gap: {formatCurrency(upsellGap)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{activeAccountPlans}</p>
              <p className="text-[10px] text-gray-500">Active</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${accountsNeedingAttention > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {accountsNeedingAttention}
              </p>
              <p className="text-[10px] text-gray-500">Attention</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{openPursuits}</p>
              <p className="text-[10px] text-gray-500">Pursuits</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-400">-</p>
              <p className="text-[10px] text-gray-500">Upsell</p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t">
            <Link href="/accounts" className="text-xs font-medium text-blue-600">
              View account plans →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
