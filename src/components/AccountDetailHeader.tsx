'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditAccountModal } from './EditAccountModal'

interface AccountPlan {
  account_plan_id: string
  account_name: string
  account_type: string
  vertical?: string
  segment?: string
  lifecycle_stage?: string
  health_score?: number
  account_owner?: string
  strategic_summary?: string
  current_arr?: number
  tier?: string            // 'strategic' | 'growth' | 'maintain' | etc.
  renewal_date?: string    // ISO date
  nps_score?: number       // -100 to 100
  csat_score?: number      // 1-5 or 1-100
}

interface AccountDetailHeaderProps {
  account: AccountPlan
}

// Helper functions for tier badge colors
function getTierColor(tier?: string) {
  switch (tier?.toLowerCase()) {
    case 'strategic': return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' }
    case 'growth': return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' }
    case 'scale': return { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400' }
    default: return null
  }
}

// Helper function for renewal date urgency
function getRenewalUrgency(renewalDate?: string) {
  if (!renewalDate) return null
  const now = new Date()
  const renewal = new Date(renewalDate)
  const daysUntil = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntil <= 30) return { color: 'text-red-600 dark:text-red-400', urgent: true }
  if (daysUntil <= 90) return { color: 'text-orange-600 dark:text-orange-400', urgent: true }
  return { color: 'text-zinc-500 dark:text-zinc-400', urgent: false }
}

// Format renewal date
function formatRenewalDate(dateStr?: string) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Format NPS score with +/- sign
function formatNPS(score?: number) {
  if (score === undefined || score === null) return null
  return score >= 0 ? `+${score}` : `${score}`
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const tierColors = getTierColor(account.tier)
  const renewalUrgency = getRenewalUrgency(account.renewal_date)
  const isCustomer = account.account_type?.toLowerCase() === 'customer'

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/accounts/${account.account_plan_id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.push('/accounts')
        router.refresh()
      } else {
        alert('Failed to delete account plan')
      }
    } catch {
      alert('Failed to delete account plan')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <div className="mb-8">
        <Link
          href="/accounts"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-2 inline-block"
        >
          ← Back to Account Plans
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                {account.account_name}
              </h1>
              {/* Tier Badge */}
              {tierColors && account.tier && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tierColors.bg} ${tierColors.text}`}>
                  {account.tier.charAt(0).toUpperCase() + account.tier.slice(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-zinc-500 dark:text-zinc-400">
                {account.vertical} • {account.account_type} • {account.lifecycle_stage || 'No stage'}
              </p>
              {/* Renewal Date - Only for customers */}
              {isCustomer && renewalUrgency && account.renewal_date && (
                <span className={`text-sm ${renewalUrgency.color}`}>
                  Renews: {formatRenewalDate(account.renewal_date)}
                </span>
              )}
              {/* NPS/CSAT Display */}
              {isCustomer && (account.nps_score !== undefined || account.csat_score !== undefined) && (
                <span className="text-sm text-zinc-400 dark:text-zinc-500">
                  {account.nps_score !== undefined && `NPS: ${formatNPS(account.nps_score)}`}
                  {account.nps_score !== undefined && account.csat_score !== undefined && ' | '}
                  {account.csat_score !== undefined && `CSAT: ${account.csat_score}%`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                ${(account.current_arr || 0).toLocaleString()}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Current ARR</p>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-800 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        account={account}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Account Plan?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              This will permanently delete <span className="font-medium">{account.account_name}</span> and all associated pursuits, stakeholders, and action items. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
