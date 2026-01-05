'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TAMAccount {
  tam_account_id: string
  company_name: string
  vertical: string
  website?: string
  estimated_deal_value: number
  fit_tier: string
}

interface Campaign {
  campaign_id: string
  name: string
}

interface PromoteToAccountPlanButtonProps {
  tamAccount: TAMAccount
  campaigns: Campaign[]
}

export function PromoteToAccountPlanButton({ tamAccount, campaigns }: PromoteToAccountPlanButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState('')

  const handleStartWizard = () => {
    // Build query params to pre-populate the wizard
    const params = new URLSearchParams({
      tam_account_id: tamAccount.tam_account_id,
      company_name: tamAccount.company_name,
    })

    if (tamAccount.vertical) {
      params.set('vertical', tamAccount.vertical)
    }
    if (tamAccount.website) {
      params.set('website', tamAccount.website)
    }
    if (selectedCampaign) {
      params.set('campaign_id', selectedCampaign)
    }

    // Route to the new account wizard with pre-populated data
    router.push(`/accounts/new?${params.toString()}`)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
      >
        Start Account Plan
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Start Account Plan
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
            <p className="font-medium mb-1">Creating account plan for: {tamAccount.company_name}</p>
            <p className="text-xs opacity-80">
              Scout AI will research the company, identify stakeholders, and help you build opportunities.
              Existing TAM contacts will be imported as stakeholders.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Link to Campaign (Optional)
            </label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            >
              <option value="">No campaign</option>
              {campaigns.map(c => (
                <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Linking to a campaign will tailor AI suggestions to campaign messaging
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartWizard}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
            >
              Start Wizard →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
