'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ExistingGoal {
  goal_id: string
  name: string
  goal_type: string
  parent_goal_id: string | null
}

interface Campaign {
  campaign_id: string
  name: string
}

interface GoalWizardProps {
  existingGoals: ExistingGoal[]
  campaigns: Campaign[]
}

type GoalType = 'revenue' | 'logos' | 'deals'
type RevenueCategory = 'new_arr' | 'renewal' | 'upsell' | ''

interface FormData {
  goal_type: GoalType
  parent_goal_id: string
  name: string
  category: RevenueCategory
  vertical: string
  target_year: number
  target_value: string
  campaign_links: { campaign_id: string; allocation_type: 'allocated' | 'attributed'; allocated_value: string }[]
}

const STEPS = [
  { id: 1, name: 'Goal Type' },
  { id: 2, name: 'Details' },
  { id: 3, name: 'Target' },
  { id: 4, name: 'Campaigns' },
  { id: 5, name: 'Review' },
]

const VERTICALS = ['Medical', 'Automotive', 'Industrial', 'Technology', 'Financial Services', 'Other']

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step.id < currentStep
                ? 'bg-green-600 text-white'
                : step.id === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
            }`}
          >
            {step.id < currentStep ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              step.id
            )}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={`w-12 h-1 mx-2 ${
                step.id < currentStep ? 'bg-green-600' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

export function GoalWizard({ existingGoals, campaigns }: GoalWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    goal_type: 'revenue',
    parent_goal_id: '',
    name: '',
    category: '',
    vertical: '',
    target_year: 2026,
    target_value: '',
    campaign_links: [],
  })

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return ['revenue', 'logos', 'deals'].includes(formData.goal_type)
      case 2: return formData.name !== ''
      case 3: return formData.target_value !== '' && parseFloat(formData.target_value) > 0
      case 4: return true // Campaign linking is optional
      case 5: return true
      default: return false
    }
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    // Create goal
    const goalData: Record<string, unknown> = {
      name: formData.name,
      goal_type: formData.goal_type,
      target_value: parseFloat(formData.target_value),
      target_year: formData.target_year,
    }

    if (formData.parent_goal_id) {
      goalData.parent_goal_id = formData.parent_goal_id
    }
    if (formData.category) {
      goalData.category = formData.category
    }
    if (formData.vertical) {
      goalData.vertical = formData.vertical
    }

    const { data: newGoal, error: goalError } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single()

    if (goalError) {
      setError(goalError.message)
      setIsSubmitting(false)
      return
    }

    // Link campaigns if any
    if (formData.campaign_links.length > 0) {
      const campaignGoalLinks = formData.campaign_links.map(link => ({
        campaign_id: link.campaign_id,
        goal_id: newGoal.goal_id,
        allocation_type: link.allocation_type,
        allocated_value: link.allocation_type === 'allocated' && link.allocated_value
          ? parseFloat(link.allocated_value)
          : null,
      }))

      await supabase.from('campaign_goals').insert(campaignGoalLinks)
    }

    setIsSubmitting(false)
    router.push(`/goals/${newGoal.goal_id}`)
    router.refresh()
  }

  // Filter goals that can be parents (same type, no parent themselves for simplicity)
  const potentialParents = existingGoals.filter(
    g => g.goal_type === formData.goal_type
  )

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Create New Goal</h1>
        <p className="text-sm text-zinc-500 mt-1">{STEPS[currentStep - 1].name}</p>
      </div>

      {/* Step Indicator */}
      <div className="px-6 pt-6">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* Step Content */}
      <div className="px-6 py-4 min-h-[300px]">
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Goal Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                What type of goal is this?
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'revenue', label: 'Revenue', desc: 'Track revenue targets ($)' },
                  { value: 'logos', label: 'New Logos', desc: 'Track new customer wins (#)' },
                  { value: 'deals', label: 'Deals', desc: 'Track deal count (#)' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateFormData({ goal_type: option.value as GoalType })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      formData.goal_type === option.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{option.label}</p>
                    <p className="text-sm text-zinc-500 mt-1">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {potentialParents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Parent Goal (optional)
                </label>
                <select
                  value={formData.parent_goal_id}
                  onChange={e => updateFormData({ parent_goal_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">No parent (top-level goal)</option>
                  {potentialParents.map(g => (
                    <option key={g.goal_id} value={g.goal_id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Child goals roll up to their parent
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Goal Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => updateFormData({ name: e.target.value })}
                placeholder={formData.goal_type === 'revenue' ? 'e.g., Medical Device New ARR' : 'e.g., New Medical Logos'}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {formData.goal_type === 'revenue' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Revenue Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => updateFormData({ category: e.target.value as RevenueCategory })}
                  className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">Select category...</option>
                  <option value="new_arr">New ARR</option>
                  <option value="renewal">Renewal</option>
                  <option value="upsell">Upsell</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Vertical (optional)
              </label>
              <select
                value={formData.vertical}
                onChange={e => updateFormData({ vertical: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">All verticals</option>
                {VERTICALS.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Target Year
              </label>
              <select
                value={formData.target_year}
                onChange={e => updateFormData({ target_year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Target */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {formData.goal_type === 'revenue' ? 'Target Amount ($)' : 'Target Count'}
              </label>
              <div className="relative">
                {formData.goal_type === 'revenue' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                )}
                <input
                  type="number"
                  value={formData.target_value}
                  onChange={e => updateFormData({ target_value: e.target.value })}
                  placeholder={formData.goal_type === 'revenue' ? '1000000' : '5'}
                  className={`w-full py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ${
                    formData.goal_type === 'revenue' ? 'pl-8 pr-3' : 'px-3'
                  }`}
                />
              </div>
              {formData.goal_type === 'revenue' && formData.target_value && (
                <p className="text-sm text-zinc-500 mt-1">
                  {formatCurrency(parseFloat(formData.target_value) || 0)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Campaign Links */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Link this goal to campaigns that will contribute to it.
            </p>

            {campaigns.length > 0 ? (
              <>
                {formData.campaign_links.map((link, index) => (
                  <div key={index} className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <select
                        value={link.campaign_id}
                        onChange={e => {
                          const newLinks = [...formData.campaign_links]
                          newLinks[index].campaign_id = e.target.value
                          updateFormData({ campaign_links: newLinks })
                        }}
                        className="flex-1 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select campaign...</option>
                        {campaigns.map(c => (
                          <option key={c.campaign_id} value={c.campaign_id}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const newLinks = formData.campaign_links.filter((_, i) => i !== index)
                          updateFormData({ campaign_links: newLinks })
                        }}
                        className="ml-2 p-2 text-zinc-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={link.allocation_type === 'allocated'}
                          onChange={() => {
                            const newLinks = [...formData.campaign_links]
                            newLinks[index].allocation_type = 'allocated'
                            updateFormData({ campaign_links: newLinks })
                          }}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Allocated</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={link.allocation_type === 'attributed'}
                          onChange={() => {
                            const newLinks = [...formData.campaign_links]
                            newLinks[index].allocation_type = 'attributed'
                            newLinks[index].allocated_value = ''
                            updateFormData({ campaign_links: newLinks })
                          }}
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">Attributed</span>
                      </label>
                    </div>

                    {link.allocation_type === 'allocated' && formData.goal_type === 'revenue' && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Allocated Amount ($)</label>
                        <input
                          type="number"
                          value={link.allocated_value}
                          onChange={e => {
                            const newLinks = [...formData.campaign_links]
                            newLinks[index].allocated_value = e.target.value
                            updateFormData({ campaign_links: newLinks })
                          }}
                          placeholder="500000"
                          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => {
                    updateFormData({
                      campaign_links: [
                        ...formData.campaign_links,
                        { campaign_id: '', allocation_type: 'attributed', allocated_value: '' },
                      ],
                    })
                  }}
                  className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-zinc-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  + Add Campaign Link
                </button>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No active campaigns available to link.</p>
            )}

            <p className="text-xs text-zinc-500">
              <strong>Allocated:</strong> Campaign owns a portion of the goal target.
              <br />
              <strong>Attributed:</strong> Campaign contributes to goal but doesn&apos;t own a specific amount.
            </p>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Review Your Goal</h3>

            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Name</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Type</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{formData.goal_type}</span>
              </div>
              {formData.category && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Category</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                    {formData.category.replace('_', ' ')}
                  </span>
                </div>
              )}
              {formData.vertical && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Vertical</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formData.vertical}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Target Year</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formData.target_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-zinc-500">Target</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formData.goal_type === 'revenue'
                    ? formatCurrency(parseFloat(formData.target_value) || 0)
                    : formData.target_value}
                </span>
              </div>
              {formData.parent_goal_id && (
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Parent Goal</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {existingGoals.find(g => g.goal_id === formData.parent_goal_id)?.name}
                  </span>
                </div>
              )}
              {formData.campaign_links.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-sm text-zinc-500">Linked Campaigns</span>
                  <ul className="mt-1 space-y-1">
                    {formData.campaign_links.filter(l => l.campaign_id).map((link, index) => (
                      <li key={index} className="text-sm text-zinc-900 dark:text-zinc-100">
                        {campaigns.find(c => c.campaign_id === link.campaign_id)?.name}
                        <span className="text-zinc-500 ml-2">
                          ({link.allocation_type}
                          {link.allocation_type === 'allocated' && link.allocated_value
                            ? `: ${formatCurrency(parseFloat(link.allocated_value))}`
                            : ''})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between">
        <button
          onClick={() => currentStep === 1 ? router.push('/goals') : handleBack()}
          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </button>

        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </button>
        )}
      </div>
    </div>
  )
}
