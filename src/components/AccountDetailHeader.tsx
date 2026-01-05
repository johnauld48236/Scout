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
}

interface AccountDetailHeaderProps {
  account: AccountPlan
}

export function AccountDetailHeader({ account }: AccountDetailHeaderProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {account.account_name}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {account.vertical} • {account.account_type} • {account.lifecycle_stage || 'No stage'}
            </p>
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
