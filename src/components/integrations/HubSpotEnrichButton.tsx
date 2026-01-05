'use client'

import { useState, useEffect } from 'react'
import { HubSpotLookup } from './HubSpotLookup'

interface HubSpotEnrichButtonProps {
  accountId: string
  accountName: string
  tamAccountId?: string
}

export function HubSpotEnrichButton({ accountId, accountName }: HubSpotEnrichButtonProps) {
  const [showLookup, setShowLookup] = useState(false)
  const [hasHubSpot, setHasHubSpot] = useState<boolean | null>(null)

  // Check if HubSpot is configured on mount
  useEffect(() => {
    checkHubSpotConfig()
  }, [])

  const checkHubSpotConfig = async () => {
    try {
      const res = await fetch('/api/integrations/hubspot/config')
      const data = await res.json()
      setHasHubSpot(data.hasToken && data.config?.enabled)
    } catch {
      setHasHubSpot(false)
    }
  }

  // Don't render if HubSpot not configured
  if (hasHubSpot === false) {
    return null
  }

  // Loading state
  if (hasHubSpot === null) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowLookup(true)}
        className="px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-2"
        style={{
          borderColor: '#ff7a59',
          color: '#ff7a59',
          backgroundColor: 'transparent',
        }}
        title="Search HubSpot for contacts, companies, and deals"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.41 10.24l-3.83 2.24 3.83 2.24V10.24zm-7.75 4.6l3.83-2.24-3.83-2.24v4.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
        HubSpot
      </button>

      <HubSpotLookup
        isOpen={showLookup}
        onClose={() => setShowLookup(false)}
        accountPlanId={accountId}
        accountName={accountName}
        defaultType="companies"
      />
    </>
  )
}
