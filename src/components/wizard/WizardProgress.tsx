'use client'

import { type WizardData, type WizardStep } from './types'

interface Step {
  id: number
  name: string
  description: string
}

interface WizardProgressProps {
  steps: readonly Step[]
  currentStep: WizardStep
  onStepClick: (step: WizardStep) => void
  completedData: WizardData
}

// Check if a step has data
function isStepStarted(step: number, data: WizardData): boolean {
  switch (step) {
    case 1:
      return !!data.accountName
    case 2:
      return data.researchFindings.length > 0
    case 3:
      return data.stakeholders.length > 0
    case 4:
      return data.pursuits.length > 0
    case 5:
      return data.competitors.length > 0
    case 6:
      return !!data.accountStrategy
    case 7:
      return data.actionItems.length > 0
    default:
      return false
  }
}

export default function WizardProgress({
  steps,
  currentStep,
  onStepClick,
  completedData,
}: WizardProgressProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => {
          const isCurrentStep = step.id === currentStep
          const isPastStep = step.id < currentStep
          const hasData = isStepStarted(step.id, completedData)
          const isClickable = step.id <= currentStep || hasData

          return (
            <li
              key={step.id}
              className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex items-center">
                {/* Step Circle */}
                <button
                  onClick={() => isClickable && onStepClick(step.id as WizardStep)}
                  disabled={!isClickable}
                  className={`
                    relative flex h-8 w-8 items-center justify-center rounded-full
                    transition-all duration-200
                    ${isCurrentStep
                      ? 'ring-2 ring-offset-2'
                      : ''
                    }
                    ${isCurrentStep || isPastStep || hasData
                      ? 'text-white'
                      : 'text-zinc-400'
                    }
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                  style={{
                    backgroundColor: isCurrentStep || isPastStep || hasData
                      ? 'var(--scout-saddle)'
                      : 'var(--scout-border)',
                    ...(isCurrentStep ? {
                      '--tw-ring-color': 'var(--scout-saddle)',
                      '--tw-ring-offset-color': 'var(--scout-parchment)'
                    } as React.CSSProperties : {})
                  }}
                >
                  {(isPastStep || (hasData && !isCurrentStep)) ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{step.id}</span>
                  )}
                </button>

                {/* Connector Line */}
                {stepIdx !== steps.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-2"
                    style={{
                      backgroundColor: isPastStep
                        ? 'var(--scout-saddle)'
                        : 'var(--scout-border)'
                    }}
                  />
                )}
              </div>

              {/* Step Label */}
              <div className="absolute -bottom-6 left-0 w-max">
                <p
                  className="text-xs font-medium"
                  style={{
                    color: isCurrentStep
                      ? 'var(--scout-saddle)'
                      : isPastStep
                        ? 'var(--scout-earth)'
                        : 'var(--scout-earth-light)'
                  }}
                >
                  {step.name}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
