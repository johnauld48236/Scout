'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AccountPlanWizard from '@/components/wizard/AccountPlanWizard'

function NewAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isComplete, setIsComplete] = useState(false)

  // Extract pre-populated data from query params (from TAM promotion)
  const initialData = {
    companyName: searchParams.get('company_name') || '',
    website: searchParams.get('website') || '',
    vertical: searchParams.get('vertical') || '',
    tamAccountId: searchParams.get('tam_account_id') || undefined,
    campaignId: searchParams.get('campaign_id') || undefined,
  }

  const handleComplete = (accountPlanId: string) => {
    setIsComplete(true)
    // Navigate to the new account plan
    router.push(`/accounts/${accountPlanId}`)
  }

  const handleCancel = () => {
    router.push('/accounts')
  }

  return (
    <AccountPlanWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
      initialData={initialData.companyName ? initialData : undefined}
    />
  )
}

export default function NewAccountPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <NewAccountContent />
      </Suspense>
    </div>
  )
}
