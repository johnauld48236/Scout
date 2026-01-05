'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ReviewNote {
  note_id: string
  note_text: string
  note_type: string
  created_at: string
}

interface Props {
  accountId: string
  initialNotes: ReviewNote[]
}

export function ReviewNotesSection({ accountId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [resolving, setResolving] = useState<string | null>(null)

  const handleResolve = async (noteId: string) => {
    setResolving(noteId)
    try {
      const response = await fetch(`/api/accounts/${accountId}/review-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, is_resolved: true }),
      })
      if (response.ok) {
        setNotes(notes.filter(n => n.note_id !== noteId))
      }
    } catch (error) {
      console.error('Failed to resolve note:', error)
    } finally {
      setResolving(null)
    }
  }

  const getNoteTypeStyle = (type: string) => {
    switch (type) {
      case 'action_needed':
      case 'concern':
        return { bg: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }
      case 'follow_up':
      case 'cleanup':
        return { bg: 'rgba(210, 105, 30, 0.15)', color: 'var(--scout-sunset)' }
      case 'win':
        return { bg: 'rgba(93, 122, 93, 0.15)', color: 'var(--scout-trail)' }
      default:
        return { bg: 'rgba(139, 90, 43, 0.15)', color: 'var(--scout-earth)' }
    }
  }

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'action_needed': return 'Action'
      case 'follow_up': return 'Follow Up'
      case 'cleanup': return 'Cleanup'
      case 'concern': return 'Concern'
      case 'win': return 'Win'
      default: return 'Note'
    }
  }

  if (notes.length === 0) return null

  return (
    <div
      className="rounded-xl border p-5 mb-6"
      style={{
        backgroundColor: 'rgba(210, 105, 30, 0.05)',
        borderColor: 'var(--scout-sunset)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-lg font-semibold flex items-center gap-2"
          style={{ color: 'var(--scout-sunset)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Review Notes ({notes.length})
        </h2>
        <Link
          href="/weekly-review"
          className="text-sm font-medium"
          style={{ color: 'var(--scout-sky)' }}
        >
          Weekly Review →
        </Link>
      </div>
      <div className="space-y-2">
        {notes.map((note) => {
          const style = getNoteTypeStyle(note.note_type)
          const isResolving = resolving === note.note_id

          return (
            <div
              key={note.note_id}
              className="flex items-start gap-3 p-3 rounded-lg group"
              style={{ backgroundColor: 'var(--scout-white)' }}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleResolve(note.note_id)}
                disabled={isResolving}
                className="shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                style={{ borderColor: 'var(--scout-trail)' }}
                title="Mark as done"
              >
                {isResolving ? (
                  <svg className="w-3 h-3 animate-spin" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--scout-trail)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Note content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ backgroundColor: style.bg, color: style.color }}
                  >
                    {getNoteTypeLabel(note.note_type)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
                  {note.note_text}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
