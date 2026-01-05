'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Campaign {
  campaign_id: string
  name: string
  type: string
  status?: string
  campaign_context?: string
}

interface CampaignSelectorProps {
  accountId: string
  appliedCampaignIds: string[]
}

export function CampaignSelector({ accountId, appliedCampaignIds }: CampaignSelectorProps) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [appliedIds, setAppliedIds] = useState<string[]>(appliedCampaignIds)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    }
  }

  const toggleCampaign = async (campaignId: string) => {
    setIsLoading(true)

    const newIds = appliedIds.includes(campaignId)
      ? appliedIds.filter(id => id !== campaignId)
      : [...appliedIds, campaignId]

    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_ids: newIds }),
      })

      if (res.ok) {
        setAppliedIds(newIds)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to update campaigns:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const appliedCampaigns = campaigns.filter(c => appliedIds.includes(c.campaign_id))
  const availableCampaigns = campaigns.filter(c => !appliedIds.includes(c.campaign_id) && c.status !== 'archived')

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Applied Campaigns Display */}
      <div className="flex items-center gap-2 flex-wrap">
        {appliedCampaigns.length > 0 ? (
          appliedCampaigns.map(campaign => (
            <button
              key={campaign.campaign_id}
              onClick={() => toggleCampaign(campaign.campaign_id)}
              className="group flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: campaign.type === 'vertical'
                  ? 'rgba(56, 152, 199, 0.15)'
                  : 'rgba(139, 69, 19, 0.15)',
                color: campaign.type === 'vertical'
                  ? 'var(--scout-sky)'
                  : 'var(--scout-saddle)',
              }}
              title={`${campaign.name}${campaign.campaign_context ? `: ${campaign.campaign_context}` : ''} - Click to remove`}
              disabled={isLoading}
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {campaign.name}
              <svg
                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))
        ) : (
          <span
            className="text-xs italic px-2 py-1"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            No campaign applied
          </span>
        )}

        {/* Add Campaign Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-dashed transition-all hover:border-solid"
          style={{
            borderColor: 'var(--scout-border)',
            color: 'var(--scout-earth-light)',
          }}
          disabled={isLoading}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Campaign
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && availableCampaigns.length > 0 && (
        <div
          className="absolute top-full left-0 mt-2 z-50 min-w-[250px] rounded-lg shadow-lg border overflow-hidden"
          style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--scout-border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--scout-earth-light)' }}>
              Apply Campaign
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {availableCampaigns.map(campaign => (
              <button
                key={campaign.campaign_id}
                onClick={() => {
                  toggleCampaign(campaign.campaign_id)
                  setIsOpen(false)
                }}
                className="w-full flex items-start gap-2 p-3 text-left hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                <span
                  className="shrink-0 mt-0.5 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: campaign.type === 'vertical'
                      ? 'var(--scout-sky)'
                      : 'var(--scout-sunset)',
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--scout-earth)' }}>
                    {campaign.name}
                  </p>
                  {campaign.campaign_context && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                      {campaign.campaign_context.slice(0, 60)}...
                    </p>
                  )}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block"
                    style={{
                      backgroundColor: 'var(--scout-parchment)',
                      color: 'var(--scout-earth-light)'
                    }}
                  >
                    {campaign.type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && availableCampaigns.length === 0 && (
        <div
          className="absolute top-full left-0 mt-2 z-50 min-w-[200px] rounded-lg shadow-lg border p-4 text-center"
          style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            All campaigns applied
          </p>
        </div>
      )}
    </div>
  )
}
