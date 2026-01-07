'use client'

import { useState } from 'react'

interface DataAnnotationProps {
  source?: string       // Where data comes from (table name, API)
  purpose?: string      // What it's used for
  creates?: string      // What it creates when actioned
  note?: string         // Additional context
  inline?: boolean      // Show inline vs icon-only
}

/**
 * DataAnnotation - Shows data source/purpose annotations in prototype mode
 *
 * Usage:
 * <DataAnnotation source="sparks table" purpose="Themes to explore" />
 * <DataAnnotation source="action_items" note="Filtered by due_date < 14 days" inline />
 */
export function DataAnnotation({ source, purpose, creates, note, inline = false }: DataAnnotationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const content = []
  if (source) content.push(`Source: ${source}`)
  if (purpose) content.push(`Purpose: ${purpose}`)
  if (creates) content.push(`Creates: ${creates}`)
  if (note) content.push(note)

  if (content.length === 0) return null

  if (inline) {
    return (
      <div
        className="text-[10px] px-2 py-1 rounded mt-1"
        style={{
          backgroundColor: 'rgba(56, 152, 199, 0.1)',
          color: 'var(--scout-sky)',
          fontFamily: 'monospace',
        }}
      >
        [i] {content.join(' | ')}
      </div>
    )
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110"
        style={{
          backgroundColor: 'rgba(56, 152, 199, 0.15)',
          color: 'var(--scout-sky)',
        }}
        title="Click for data source info"
      >
        i
      </button>
      {isExpanded && (
        <span
          className="absolute z-50 top-6 left-0 min-w-[200px] p-2 rounded-lg shadow-lg border text-[11px] block"
          style={{
            backgroundColor: 'var(--scout-white)',
            borderColor: 'var(--scout-sky)',
          }}
        >
          {content.map((line, i) => (
            <span key={i} className="block mb-1 last:mb-0" style={{ color: 'var(--scout-earth)' }}>
              {line}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

/**
 * AnnotationBlock - Larger annotation block for section headers
 */
export function AnnotationBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] px-3 py-2 rounded-lg mb-3 border"
      style={{
        backgroundColor: 'rgba(56, 152, 199, 0.05)',
        borderColor: 'rgba(56, 152, 199, 0.2)',
        color: 'var(--scout-sky)',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </div>
  )
}

/**
 * ModeIndicator - Shows current mode and derivation logic
 */
export function ModeIndicator({
  mode,
  dataAreas,
  threshold = 3,
  onToggle,
}: {
  mode: 'discovery' | 'execution'
  dataAreas: number
  threshold?: number
  onToggle: () => void
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg mb-4 border"
      style={{
        backgroundColor: 'var(--scout-parchment)',
        borderColor: 'var(--scout-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
          MODE: {mode === 'execution' ? 'Execution' : 'Discovery'}
          {mode === 'execution' && ' ✓'}
        </span>
        <DataAnnotation
          note={`Mode derived from: Has data in ${dataAreas}/5 areas. Threshold: ${threshold}+ areas = Execution mode`}
        />
      </div>
      <button
        onClick={onToggle}
        className="text-xs px-3 py-1 rounded border transition-colors hover:bg-gray-50"
        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
      >
        Switch to {mode === 'execution' ? 'Discovery' : 'Execution'}
      </button>
    </div>
  )
}
