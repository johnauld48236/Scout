'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Campaign {
  campaign_id: string
  name: string
  status: string
}

interface LinkedCampaign {
  campaign_id: string
  allocation_type: string
  allocated_value: number | null
}

interface LinkCampaignToGoalProps {
  goalId: string
  goalName: string
  linkedCampaigns: LinkedCampaign[]
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function LinkCampaignToGoal({ goalId, goalName, linkedCampaigns }: LinkCampaignToGoalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [allocationType, setAllocationType] = useState<'attributed' | 'allocated'>('attributed')
  const [allocatedValue, setAllocatedValue] = useState('')

  // Fetch available campaigns when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      const supabase = createClient()

      supabase
        .from('campaigns')
        .select('campaign_id, name, status')
        .in('status', ['active', 'planned'])
        .order('name')
        .then(({ data }) => {
          // Filter out already linked campaigns
          const linkedIds = linkedCampaigns.map(lc => lc.campaign_id)
          const available = (data || []).filter(c => !linkedIds.includes(c.campaign_id))
          setCampaigns(available)
          setLoading(false)
        })
    }
  }, [isOpen, linkedCampaigns])

  const handleSubmit = async () => {
    if (!selectedCampaign) return

    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    const insertData: Record<string, unknown> = {
      campaign_id: selectedCampaign,
      goal_id: goalId,
      allocation_type: allocationType,
    }

    if (allocationType === 'allocated' && allocatedValue) {
      insertData.allocated_value = parseFloat(allocatedValue)
    }

    const { error: insertError } = await supabase
      .from('campaign_goals')
      .insert(insertData)

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setIsOpen(false)
    setSelectedCampaign('')
    setAllocationType('attributed')
    setAllocatedValue('')
    router.refresh()
  }

  const handleUnlink = async (campaignId: string) => {
    const supabase = createClient()

    await supabase
      .from('campaign_goals')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('goal_id', goalId)

    router.refresh()
  }

  return (
    <>
      {/* Link Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
      >
        + Link Campaign
      </button>

      {/* Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Link Campaign to Goal</h2>
                <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm">
                  <p className="text-zinc-600 dark:text-zinc-400">Linking campaign to:</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{goalName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Campaign
                  </label>
                  {loading ? (
                    <div className="text-sm text-zinc-500">Loading campaigns...</div>
                  ) : campaigns.length > 0 ? (
                    <select
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="">Select a campaign...</option>
                      {campaigns.map(c => (
                        <option key={c.campaign_id} value={c.campaign_id}>
                          {c.name} ({c.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-zinc-500">No available campaigns to link</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Allocation Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="attributed"
                        checked={allocationType === 'attributed'}
                        onChange={() => setAllocationType('attributed')}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Attributed</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="allocated"
                        checked={allocationType === 'allocated'}
                        onChange={() => setAllocationType('allocated')}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Allocated</span>
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {allocationType === 'attributed'
                      ? 'Campaign contributes to goal but doesn\'t own a specific amount'
                      : 'Campaign owns a specific portion of the goal target'
                    }
                  </p>
                </div>

                {allocationType === 'allocated' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Allocated Value ($)
                    </label>
                    <input
                      type="number"
                      value={allocatedValue}
                      onChange={(e) => setAllocatedValue(e.target.value)}
                      placeholder="e.g., 1000000"
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedCampaign}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md"
                >
                  {isSubmitting ? 'Linking...' : 'Link Campaign'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
