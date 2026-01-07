'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Pursuit {
  pursuit_id: string
  name: string
  stage: string
  thesis?: string
}

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Signal {
  signal_id: string
  summary: string
}

interface SuggestedAction {
  id: string
  description: string
  bucket: '30' | '60' | '90'
  priority: 'high' | 'medium' | 'low'
  rationale: string
  relatedTo?: {
    type: 'pursuit' | 'stakeholder' | 'signal'
    id: string
    name: string
  }
  selected: boolean
}

interface PlanBuilderProps {
  accountId: string
  accountName: string
  pursuits: Pursuit[]
  stakeholders: Stakeholder[]
  signals: Signal[]
  existingActions?: { description: string; bucket: string }[]
}

type Step = 'context' | 'objectives' | 'actions' | 'review' | 'complete'

export function PlanBuilder({
  accountId,
  accountName,
  pursuits,
  stakeholders,
  signals,
  existingActions = [],
}: PlanBuilderProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('context')
  const [isGenerating, setIsGenerating] = useState(false)

  // Context step
  const [primaryObjective, setPrimaryObjective] = useState('')
  const [timeframe, setTimeframe] = useState<'30' | '60' | '90'>('90')
  const [focusAreas, setFocusAreas] = useState<string[]>([])

  // Suggested actions from AI
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([])

  // Custom actions added by user
  const [customAction, setCustomAction] = useState('')
  const [customBucket, setCustomBucket] = useState<'30' | '60' | '90'>('30')

  const steps: { id: Step; label: string; number: number }[] = [
    { id: 'context', label: 'Context', number: 1 },
    { id: 'objectives', label: 'Objectives', number: 2 },
    { id: 'actions', label: 'Actions', number: 3 },
    { id: 'review', label: 'Review', number: 4 },
  ]

  const focusAreaOptions = [
    'New business development',
    'Expand existing relationship',
    'Competitive displacement',
    'Retention / risk mitigation',
    'Executive alignment',
    'Technical validation',
    'Use case discovery',
  ]

  const handleGenerateActions = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          accountName,
          primaryObjective,
          timeframe,
          focusAreas,
          pursuits: pursuits.slice(0, 5),
          stakeholders: stakeholders.slice(0, 10),
          signals: signals.slice(0, 10),
          existingActions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestedActions(
          (data.actions || []).map((a: Omit<SuggestedAction, 'id' | 'selected'>, idx: number) => ({
            ...a,
            id: `suggested-${idx}`,
            selected: true,
          }))
        )
        setCurrentStep('actions')
      }
    } catch (error) {
      console.error('Failed to generate plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleAction = (actionId: string) => {
    setSuggestedActions(prev =>
      prev.map(a => (a.id === actionId ? { ...a, selected: !a.selected } : a))
    )
  }

  const addCustomAction = () => {
    if (!customAction.trim()) return
    const newAction: SuggestedAction = {
      id: `custom-${Date.now()}`,
      description: customAction.trim(),
      bucket: customBucket,
      priority: 'medium',
      rationale: 'Added manually',
      selected: true,
    }
    setSuggestedActions(prev => [...prev, newAction])
    setCustomAction('')
  }

  const handleCommitPlan = async () => {
    const selectedActions = suggestedActions.filter(a => a.selected)
    if (selectedActions.length === 0) return

    setIsGenerating(true)
    try {
      const response = await fetch('/api/accounts/' + accountId + '/tracker-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: selectedActions.map(a => ({
            description: a.description,
            bucket: a.bucket,
            priority: a.priority,
            status: 'pending',
          })),
        }),
      })

      if (response.ok) {
        setCurrentStep('complete')
      }
    } catch (error) {
      console.error('Failed to commit plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedCount = suggestedActions.filter(a => a.selected).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--scout-parchment)' }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
                  Build Your 30/60/90 Plan
                </h1>
                <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{accountName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScoutAIIcon size={20} className="text-scout-saddle" />
              <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>AI Strategy</span>
            </div>
          </div>

          {/* Step Indicator */}
          {currentStep !== 'complete' && (
            <div className="flex items-center justify-center gap-4 mt-4">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      currentStep === step.id ? 'text-white' : step.number < steps.findIndex(s => s.id === currentStep) + 1 ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor:
                        currentStep === step.id ? 'var(--scout-saddle)' :
                        step.number < steps.findIndex(s => s.id === currentStep) + 1 ? 'var(--scout-trail)' :
                        'var(--scout-border)',
                      color: step.number >= steps.findIndex(s => s.id === currentStep) + 1 && currentStep !== step.id ? 'var(--scout-earth-light)' : 'white',
                    }}
                  >
                    {step.number < steps.findIndex(s => s.id === currentStep) + 1 ? '✓' : step.number}
                  </div>
                  <span className="ml-2 text-sm hidden sm:inline" style={{ color: currentStep === step.id ? 'var(--scout-saddle)' : 'var(--scout-earth-light)' }}>
                    {step.label}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="w-8 h-0.5 mx-2" style={{ backgroundColor: 'var(--scout-border)' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Step: Context */}
        {currentStep === 'context' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
                What are you trying to achieve?
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                Set the context so I can suggest relevant actions
              </p>
            </div>

            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-saddle)' }}>
                Primary Objective
              </label>
              <textarea
                value={primaryObjective}
                onChange={(e) => setPrimaryObjective(e.target.value)}
                placeholder="e.g., Close a $500K deal in Q2, Establish executive relationship with CTO..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>

            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--scout-saddle)' }}>
                Planning Timeframe
              </label>
              <div className="flex gap-3">
                {(['30', '60', '90'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      timeframe === t ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: timeframe === t ? 'var(--scout-saddle)' : 'transparent',
                      borderColor: timeframe === t ? 'var(--scout-saddle)' : 'var(--scout-border)',
                      color: timeframe === t ? 'white' : 'var(--scout-earth)',
                    }}
                  >
                    {t} Days
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('objectives')}
              disabled={!primaryObjective.trim()}
              className="w-full py-3 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step: Objectives / Focus Areas */}
        {currentStep === 'objectives' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
                What should we focus on?
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                Select the areas that align with your objective
              </p>
            </div>

            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="grid grid-cols-2 gap-3">
                {focusAreaOptions.map(area => (
                  <button
                    key={area}
                    onClick={() => {
                      setFocusAreas(prev =>
                        prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                      )
                    }}
                    className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                      focusAreas.includes(area) ? 'border-2' : ''
                    }`}
                    style={{
                      backgroundColor: focusAreas.includes(area) ? 'rgba(93, 122, 93, 0.1)' : 'transparent',
                      borderColor: focusAreas.includes(area) ? 'var(--scout-trail)' : 'var(--scout-border)',
                      color: 'var(--scout-earth)',
                    }}
                  >
                    {focusAreas.includes(area) && (
                      <span className="mr-2" style={{ color: 'var(--scout-trail)' }}>✓</span>
                    )}
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Context Summary */}
            {(pursuits.length > 0 || stakeholders.length > 0 || signals.length > 0) && (
              <div
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                  I'll use this context to suggest actions:
                </p>
                <div className="flex flex-wrap gap-2">
                  {pursuits.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(56, 152, 199, 0.15)', color: 'var(--scout-sky)' }}>
                      {pursuits.length} opportunities
                    </span>
                  )}
                  {stakeholders.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }}>
                      {stakeholders.length} stakeholders
                    </span>
                  )}
                  {signals.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }}>
                      {signals.length} signals
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('context')}
                className="px-6 py-3 rounded-lg border font-medium"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Back
              </button>
              <button
                onClick={handleGenerateActions}
                disabled={focusAreas.length === 0 || isGenerating}
                className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <ScoutAIIcon size={16} className="text-white" />
                    Generate Actions
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Actions */}
        {currentStep === 'actions' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
                Review Suggested Actions
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                Select the actions you want to commit to. {selectedCount} selected.
              </p>
            </div>

            {/* Actions by Bucket */}
            {(['30', '60', '90'] as const).map(bucket => {
              const bucketActions = suggestedActions.filter(a => a.bucket === bucket)
              if (bucketActions.length === 0) return null

              return (
                <div
                  key={bucket}
                  className="rounded-xl border p-5"
                  style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        backgroundColor: bucket === '30' ? 'var(--scout-sunset)' :
                          bucket === '60' ? 'var(--scout-sky)' : 'var(--scout-trail)',
                      }}
                    >
                      {bucket}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--scout-saddle)' }}>
                      {bucket}-Day Actions
                    </span>
                  </div>

                  <div className="space-y-3">
                    {bucketActions.map(action => (
                      <div
                        key={action.id}
                        onClick={() => toggleAction(action.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          action.selected ? 'border-2' : ''
                        }`}
                        style={{
                          backgroundColor: action.selected ? 'rgba(93, 122, 93, 0.05)' : 'transparent',
                          borderColor: action.selected ? 'var(--scout-trail)' : 'var(--scout-border)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              action.selected ? 'text-white' : ''
                            }`}
                            style={{
                              backgroundColor: action.selected ? 'var(--scout-trail)' : 'transparent',
                              borderColor: action.selected ? 'var(--scout-trail)' : 'var(--scout-border)',
                            }}
                          >
                            {action.selected && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
                              {action.description}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                              {action.rationale}
                            </p>
                            {action.relatedTo && (
                              <span
                                className="inline-block text-xs px-2 py-0.5 rounded-full mt-2"
                                style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                              >
                                {action.relatedTo.name}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: action.priority === 'high' ? 'rgba(169, 68, 66, 0.15)' :
                                action.priority === 'medium' ? 'rgba(210, 105, 30, 0.15)' :
                                'var(--scout-parchment)',
                              color: action.priority === 'high' ? 'var(--scout-clay)' :
                                action.priority === 'medium' ? 'var(--scout-sunset)' :
                                'var(--scout-earth-light)',
                            }}
                          >
                            {action.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Add Custom Action */}
            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <h3 className="font-medium mb-3" style={{ color: 'var(--scout-saddle)' }}>
                Add Custom Action
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="Describe the action..."
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--scout-border)' }}
                />
                <select
                  value={customBucket}
                  onChange={(e) => setCustomBucket(e.target.value as '30' | '60' | '90')}
                  className="px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--scout-border)' }}
                >
                  <option value="30">30 Day</option>
                  <option value="60">60 Day</option>
                  <option value="90">90 Day</option>
                </select>
                <button
                  onClick={addCustomAction}
                  disabled={!customAction.trim()}
                  className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--scout-saddle)', color: 'var(--scout-saddle)' }}
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('objectives')}
                className="px-6 py-3 rounded-lg border font-medium"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep('review')}
                disabled={selectedCount === 0}
                className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                Review Plan ({selectedCount} actions)
              </button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
                Ready to Commit?
              </h2>
              <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
                These {selectedCount} actions will be added to your 30/60/90 tracker
              </p>
            </div>

            <div
              className="rounded-xl border p-6"
              style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>OBJECTIVE</p>
                  <p className="text-sm" style={{ color: 'var(--scout-saddle)' }}>{primaryObjective}</p>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--scout-earth-light)' }}>FOCUS AREAS</p>
                  <div className="flex flex-wrap gap-2">
                    {focusAreas.map(area => (
                      <span
                        key={area}
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth)' }}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
                    ACTIONS BY TIMEFRAME
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {(['30', '60', '90'] as const).map(bucket => {
                      const count = suggestedActions.filter(a => a.selected && a.bucket === bucket).length
                      return (
                        <div
                          key={bucket}
                          className="text-center p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--scout-parchment)' }}
                        >
                          <p className="text-2xl font-bold" style={{ color: 'var(--scout-saddle)' }}>{count}</p>
                          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>{bucket}-day</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('actions')}
                className="px-6 py-3 rounded-lg border font-medium"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Back
              </button>
              <button
                onClick={handleCommitPlan}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Commit Plan
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgba(93, 122, 93, 0.15)' }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--scout-trail)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--scout-saddle)' }}>
              Plan Created!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--scout-earth-light)' }}>
              {selectedCount} actions have been added to your 30/60/90 tracker
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push(`/accounts/${accountId}`)}
                className="px-6 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                View Account
              </button>
              <button
                onClick={() => {
                  setCurrentStep('context')
                  setPrimaryObjective('')
                  setFocusAreas([])
                  setSuggestedActions([])
                }}
                className="px-6 py-3 rounded-lg border font-medium"
                style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
              >
                Build Another Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
