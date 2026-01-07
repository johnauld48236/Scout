'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AccountPlanWizard from '@/components/wizard/AccountPlanWizard'

function NewTerritoryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isComplete, setIsComplete] = useState(false)

  // Extract pre-populated data from query params (from Landscape promotion)
  const initialData = {
    companyName: searchParams.get('company_name') || '',
    website: searchParams.get('website') || '',
    vertical: searchParams.get('vertical') || '',
    tamAccountId: searchParams.get('tam_account_id') || undefined,
    campaignId: searchParams.get('campaign_id') || undefined,
  }

  const handleComplete = (accountPlanId: string) => {
    setIsComplete(true)
    // Navigate to the new territory (prototype view is default)
    router.push(`/territory/${accountPlanId}`)
  }

  const handleCancel = () => {
    router.push('/territories')
  }

  return (
    <AccountPlanWizard
      onComplete={handleComplete}
      onCancel={handleCancel}
      initialData={initialData.companyName ? initialData : undefined}
      // TODO: Add useScoutTerminology prop to AccountPlanWizard for terminology updates
    />
  )
}

export default function NewTerritoryPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <NewTerritoryContent />
      </Suspense>
    </div>
  )
}
