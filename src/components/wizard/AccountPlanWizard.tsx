'use client'

import { useState, useCallback } from 'react'
import { WIZARD_STEPS, DEFAULT_WIZARD_DATA, type WizardData, type WizardStep } from './types'
import WizardProgress from './WizardProgress'
import Step1AccountBasics from './steps/Step1AccountBasics'
import Step2Research from './steps/Step2Research'
import Step3Stakeholders from './steps/Step3Stakeholders'
import Step4Opportunities from './steps/Step4Opportunities'
import Step5Competitors from './steps/Step5Competitors'
import Step6Strategy from './steps/Step6Strategy'
import Step7Actions from './steps/Step7Actions'

interface InitialData {
  companyName?: string
  website?: string
  vertical?: string
  tamAccountId?: string
  campaignId?: string
}

interface AccountPlanWizardProps {
  onComplete: (accountPlanId: string) => void
  onCancel: () => void
  initialData?: InitialData
}

export default function AccountPlanWizard({ onComplete, onCancel, initialData }: AccountPlanWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [wizardData, setWizardData] = useState<WizardData>(() => {
    // Merge initial data from TAM promotion with defaults
    if (initialData) {
      return {
        ...DEFAULT_WIZARD_DATA,
        accountName: initialData.companyName || '',
        website: initialData.website || '',
        vertical: initialData.vertical || '',
        tamAccountId: initialData.tamAccountId,
        campaignId: initialData.campaignId,
      }
    }
    return DEFAULT_WIZARD_DATA
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }))
  }, [])

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step)
    setError(null)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < 7) {
      setCurrentStep((currentStep + 1) as WizardStep)
      setError(null)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
      setError(null)
    }
  }, [currentStep])

  const saveAccountPlan = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/accounts/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create account plan')
      }

      const { accountPlanId } = await response.json()
      onComplete(accountPlanId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account plan')
    } finally {
      setIsSaving(false)
    }
  }

  const renderStep = () => {
    const stepProps = {
      data: wizardData,
      updateData: updateWizardData,
      onNext: nextStep,
      onPrev: prevStep,
    }

    switch (currentStep) {
      case 1:
        return <Step1AccountBasics {...stepProps} onCancel={onCancel} />
      case 2:
        return <Step2Research {...stepProps} />
      case 3:
        return <Step3Stakeholders {...stepProps} />
      case 4:
        return <Step4Opportunities {...stepProps} />
      case 5:
        return <Step5Competitors {...stepProps} />
      case 6:
        return <Step6Strategy {...stepProps} />
      case 7:
        return (
          <Step7Actions
            {...stepProps}
            onComplete={saveAccountPlan}
            isSaving={isSaving}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Create Account Plan</h1>
        <p className="text-zinc-500 mt-1">Build a comprehensive account plan with AI assistance</p>
      </div>

      {/* Progress */}
      <WizardProgress
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
        completedData={wizardData}
      />

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="mt-8">
        {renderStep()}
      </div>
    </div>
  )
}
