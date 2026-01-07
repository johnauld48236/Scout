'use client'

import { DataAnnotation } from '@/components/prototype/DataAnnotation'

interface DiscoveryStatus {
  structure: { complete: boolean; count: number }
  people: { complete: boolean; count: number }
  signals: { complete: boolean; count: number }
  sparks: { complete: boolean; count: number }
  plan: { complete: boolean; count: number }
}

interface VectorOutDiscoveryModeProps {
  discoveryStatus: DiscoveryStatus
  onStepClick: (step: string) => void
}

export function VectorOutDiscoveryMode({ discoveryStatus, onStepClick }: VectorOutDiscoveryModeProps) {
  const getStepStatus = (step: { complete: boolean; count: number }) => {
    if (step.complete && step.count > 0) return { label: '✓ Complete', style: 'complete' }
    if (step.count > 0) return { label: '○ In Progress', style: 'in_progress' }
    return { label: '○ Ready', style: 'ready' }
  }

  const steps = [
    {
      id: 'structure',
      title: '1. Terrain',
      status: getStepStatus(discoveryStatus.structure),
      count: discoveryStatus.structure.count,
      countLabel: 'divisions mapped',
      source: 'account_divisions',
      action: 'Map',
      actionIcon: null,
    },
    {
      id: 'people',
      title: '2. Compass',
      status: getStepStatus(discoveryStatus.people),
      count: discoveryStatus.people.count,
      countLabel: 'guides identified',
      source: 'stakeholders table',
      action: discoveryStatus.people.count > 0 ? 'View' : 'Find',
      actionIcon: discoveryStatus.people.count === 0 ? '🤖' : null,
    },
    {
      id: 'signals',
      title: '3. Recon',
      status: getStepStatus(discoveryStatus.signals),
      count: discoveryStatus.signals.count,
      countLabel: 'signals gathered',
      source: 'account_signals table',
      action: 'Gather',
      actionIcon: '🤖',
    },
    {
      id: 'sparks',
      title: '4. Trails',
      status: getStepStatus(discoveryStatus.sparks),
      count: discoveryStatus.sparks.count,
      countLabel: discoveryStatus.sparks.count > 0 ? 'trails to explore' : 'AI can discover trails',
      source: 'scout_themes table',
      creates: 'scout_themes records',
      action: 'Blaze',
      actionIcon: '🤖',
    },
    {
      id: 'plan',
      title: '5. Journey',
      status: getStepStatus(discoveryStatus.plan),
      count: discoveryStatus.plan.count,
      countLabel: discoveryStatus.plan.count > 0 ? 'action items' : 'Chart your path forward',
      source: 'action_items, risks, buckets',
      creates: 'action_items, risks, buckets',
      action: 'Plan Journey',
      actionIcon: '🤖',
    },
  ]

  return (
    <div className="p-6">
      <h2
        className="text-lg font-semibold mb-6"
        style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
      >
        Build Your Sales Intelligence
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {steps.slice(0, 3).map((step) => (
          <StepCard key={step.id} step={step} onClick={() => onStepClick(step.id)} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-[66%]">
        {steps.slice(3).map((step) => (
          <StepCard key={step.id} step={step} onClick={() => onStepClick(step.id)} />
        ))}
      </div>
    </div>
  )
}

function StepCard({
  step,
  onClick,
}: {
  step: {
    id: string
    title: string
    status: { label: string; style: string }
    count: number
    countLabel: string
    source: string
    creates?: string
    action: string
    actionIcon: string | null
  }
  onClick: () => void
}) {
  const getStatusColor = (style: string) => {
    switch (style) {
      case 'complete':
        return { bg: 'rgba(93, 122, 93, 0.1)', text: 'var(--scout-trail)' }
      case 'in_progress':
        return { bg: 'rgba(56, 152, 199, 0.1)', text: 'var(--scout-sky)' }
      default:
        return { bg: 'var(--scout-parchment)', text: 'var(--scout-earth-light)' }
    }
  }

  const statusStyle = getStatusColor(step.status.style)

  return (
    <div
      className="p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
          {step.title}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {step.status.label}
        </span>
      </div>

      {/* Content */}
      <div className="mb-3">
        {step.count > 0 ? (
          <p className="text-2xl font-bold" style={{ color: 'var(--scout-saddle)' }}>
            {step.count}
          </p>
        ) : null}
        <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
          {step.countLabel}
        </p>
      </div>

      {/* Annotations */}
      <div className="mb-3 space-y-1">
        <DataAnnotation
          source={step.source}
          creates={step.creates}
          inline
        />
      </div>

      {/* Action Button */}
      <button
        className="w-full py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-gray-50"
        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-saddle)' }}
      >
        {step.actionIcon && <span className="mr-1">{step.actionIcon}</span>}
        {step.action}
      </button>
    </div>
  )
}
