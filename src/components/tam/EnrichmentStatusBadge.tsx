'use client'

interface Props {
  status: 'pending' | 'enriched' | 'failed' | null | undefined
  showLabel?: boolean
}

const config: Record<string, { label: string; bg: string; text: string }> = {
  pending: {
    label: 'Pending',
    bg: 'rgba(210, 105, 30, 0.15)',
    text: 'var(--scout-sunset)'
  },
  enriched: {
    label: 'Enriched',
    bg: 'rgba(93, 122, 93, 0.15)',
    text: 'var(--scout-trail)'
  },
  failed: {
    label: 'Failed',
    bg: 'rgba(169, 68, 66, 0.15)',
    text: 'var(--scout-clay)'
  }
}

export function EnrichmentStatusBadge({ status, showLabel = true }: Props) {
  const { label, bg, text } = config[status || 'pending'] || config.pending

  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {showLabel ? label : status === 'enriched' ? '✓' : status === 'failed' ? '✗' : '○'}
    </span>
  )
}
