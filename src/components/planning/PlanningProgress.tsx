'use client'

import { useState } from 'react'

interface PlanningProgressProps {
  completeness: number
}

export function PlanningProgress({ completeness }: PlanningProgressProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getColor = () => {
    if (completeness >= 80) return 'var(--scout-trail)'
    if (completeness >= 50) return 'var(--scout-sunset)'
    return 'var(--scout-clay)'
  }

  const getLabel = () => {
    if (completeness >= 80) return 'Ready'
    if (completeness >= 50) return 'In Progress'
    return 'Getting Started'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/50"
        style={{ borderColor: 'var(--scout-border)' }}
      >
        {/* Progress ring */}
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="var(--scout-border)"
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke={getColor()}
              strokeWidth="3"
              strokeDasharray={`${(completeness / 100) * 75.4} 75.4`}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
            style={{ color: getColor() }}
          >
            {completeness}
          </span>
        </div>
        <div className="text-left">
          <p className="text-xs font-medium" style={{ color: 'var(--scout-earth)' }}>
            Plan {completeness}%
          </p>
          <p className="text-xs" style={{ color: getColor() }}>
            {getLabel()}
          </p>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          style={{ color: 'var(--scout-earth-light)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-lg border shadow-lg z-50 p-4"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <h4
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
          >
            Plan Completeness
          </h4>
          <div className="space-y-2">
            <CheckItem
              label="Business units defined"
              checked={completeness >= 12.5}
            />
            <CheckItem
              label="Signals mapped to units"
              checked={completeness >= 25}
            />
            <CheckItem
              label="Stakeholders placed"
              checked={completeness >= 37.5}
            />
            <CheckItem
              label="Opportunities have thesis"
              checked={completeness >= 50}
            />
            <CheckItem
              label="Engagement plans defined"
              checked={completeness >= 62.5}
            />
            <CheckItem
              label="Milestones set"
              checked={completeness >= 75}
            />
            <CheckItem
              label="Actions created"
              checked={completeness >= 87.5}
            />
            <CheckItem
              label="Strategy documented"
              checked={completeness === 100}
            />
          </div>
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--scout-border)' }}>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${completeness}%`,
                  backgroundColor: getColor(),
                }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>
              {completeness >= 80
                ? 'Your plan is ready to activate!'
                : completeness >= 50
                ? 'Keep going - you\'re making great progress.'
                : 'Complete more sections to build a solid plan.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-4 h-4 rounded flex items-center justify-center"
        style={{
          backgroundColor: checked ? 'var(--scout-trail)' : 'var(--scout-border)',
        }}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span
        className="text-sm"
        style={{
          color: checked ? 'var(--scout-earth)' : 'var(--scout-earth-light)',
          textDecoration: checked ? 'none' : 'none',
        }}
      >
        {label}
      </span>
    </div>
  )
}
