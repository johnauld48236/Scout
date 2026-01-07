'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TAMAccount {
  tam_account_id: string
  company_name: string
  vertical: string
  estimated_deal_value: number
  fit_tier: string
}

interface Campaign {
  campaign_id: string
  name: string
}

interface PromoteToAccountPlanModalProps {
  tamAccount: TAMAccount
  campaigns: Campaign[]
  onClose: () => void
  onSuccess: () => void
  useScoutTerminology?: boolean  // Use "Establish Territory" instead of "Create Account Plan"
}

export function PromoteToAccountPlanModal({ tamAccount, campaigns, onClose, onSuccess, useScoutTerminology = false }: PromoteToAccountPlanModalProps) {
  const labels = useScoutTerminology
    ? { action: 'Establish Territory', creating: 'Establishing...' }
    : { action: 'Create Account Plan', creating: 'Creating...' }
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    account_name: tamAccount.company_name,
    vertical: tamAccount.vertical || '',
    campaign_id: '',
    create_pursuit: false,
    pursuit_name: '',
    pursuit_value: tamAccount.estimated_deal_value?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    // Create Account Plan
    const accountPlanData: Record<string, unknown> = {
      account_name: formData.account_name,
      vertical: formData.vertical,
      account_type: 'Prospect',
      tam_account_id: tamAccount.tam_account_id,
    }

    if (formData.campaign_id) {
      accountPlanData.campaign_id = formData.campaign_id
    }

    const { data: newAccountPlan, error: accountError } = await supabase
      .from('account_plans')
      .insert(accountPlanData)
      .select()
      .single()

    if (accountError) {
      setError(accountError.message)
      setIsSubmitting(false)
      return
    }

    // Update TAM account status
    await supabase
      .from('tam_accounts')
      .update({
        status: 'Converted',
        promoted_to_account_plan_id: newAccountPlan.account_plan_id,
        promoted_at: new Date().toISOString(),
      })
      .eq('tam_account_id', tamAccount.tam_account_id)

    // Copy contacts to stakeholders
    const { data: contacts } = await supabase
      .from('tam_contacts')
      .select('*')
      .eq('tam_account_id', tamAccount.tam_account_id)

    if (contacts && contacts.length > 0) {
      const stakeholders = contacts.map(c => ({
        account_plan_id: newAccountPlan.account_plan_id,
        full_name: c.full_name,
        title: c.title,
        email: c.email,
        phone: c.phone,
        linkedin_url: c.linkedin_url,
        profile_notes: c.notes,
      }))

      await supabase.from('stakeholders').insert(stakeholders)
    }

    // Create initial pursuit if requested
    if (formData.create_pursuit && formData.pursuit_name) {
      await supabase.from('pursuits').insert({
        account_plan_id: newAccountPlan.account_plan_id,
        name: formData.pursuit_name,
        estimated_value: formData.pursuit_value ? parseFloat(formData.pursuit_value) : null,
        stage: 'Discovery',
        probability: 10,
      })
    }

    setIsSubmitting(false)
    onSuccess()
    router.push(`/accounts/${newAccountPlan.account_plan_id}`)
    router.refresh()
  }

  return (
    <>
      {/* Extra backdrop for nested modal */}
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />

      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Start Account Plan
            </h2>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
              This will create an Account Plan from <strong>{tamAccount.company_name}</strong> and copy over contacts as stakeholders.
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Vertical
              </label>
              <input
                type="text"
                value={formData.vertical}
                onChange={(e) => setFormData(prev => ({ ...prev, vertical: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign (Optional)
              </label>
              <select
                value={formData.campaign_id}
                onChange={(e) => setFormData(prev => ({ ...prev, campaign_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">No campaign</option>
                {campaigns.map(c => (
                  <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.create_pursuit}
                  onChange={(e) => setFormData(prev => ({ ...prev, create_pursuit: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Create initial pursuit</span>
              </label>

              {formData.create_pursuit && (
                <div className="mt-4 space-y-4 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Pursuit Name
                    </label>
                    <input
                      type="text"
                      value={formData.pursuit_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, pursuit_name: e.target.value }))}
                      placeholder="Initial Engagement"
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Estimated Value ($)
                    </label>
                    <input
                      type="number"
                      value={formData.pursuit_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, pursuit_value: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isSubmitting ? labels.creating : labels.action}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
