'use client'

import { useState, useEffect } from 'react'

interface Note {
  note_id: string
  note_text: string
  note_type: string
  created_at: string
  is_resolved: boolean
}

interface ReviewNoteModalProps {
  account: {
    account_plan_id: string
    account_name: string
  }
  onClose: () => void
  onNoteAdded: () => void
}

const NOTE_TYPES = [
  { value: 'general', label: 'General Note', color: 'var(--scout-earth)' },
  { value: 'action_needed', label: 'Action Needed', color: 'var(--scout-clay)' },
  { value: 'follow_up', label: 'Follow Up', color: 'var(--scout-sunset)' },
  { value: 'cleanup', label: 'Cleanup Required', color: 'var(--scout-sunset)' },
  { value: 'win', label: 'Win/Progress', color: 'var(--scout-trail)' },
  { value: 'concern', label: 'Concern', color: 'var(--scout-clay)' },
]

export function ReviewNoteModal({ account, onClose, onNoteAdded }: ReviewNoteModalProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState({ text: '', type: 'general' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [account.account_plan_id])

  const loadNotes = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.account_plan_id}/review-notes`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.text.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${account.account_plan_id}/review-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_text: newNote.text,
          note_type: newNote.type,
        }),
      })

      if (response.ok) {
        setNewNote({ text: '', type: 'general' })
        loadNotes()
        onNoteAdded()
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleResolved = async (noteId: string, currentResolved: boolean) => {
    try {
      await fetch(`/api/accounts/${account.account_plan_id}/review-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: noteId,
          is_resolved: !currentResolved,
        }),
      })
      loadNotes()
      onNoteAdded()
    } catch (error) {
      console.error('Failed to toggle resolved:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/accounts/${account.account_plan_id}/review-notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId }),
      })
      loadNotes()
      onNoteAdded()
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const getNoteTypeStyle = (type: string) => {
    const noteType = NOTE_TYPES.find(t => t.value === type)
    return noteType?.color || 'var(--scout-earth)'
  }

  const getNoteTypeLabel = (type: string) => {
    const noteType = NOTE_TYPES.find(t => t.value === type)
    return noteType?.label || type
  }

  const unresolvedNotes = notes.filter(n => !n.is_resolved)
  const resolvedNotes = notes.filter(n => n.is_resolved)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              Review Notes
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--scout-earth-light)' }}>
            {account.account_name}
          </p>
        </div>

        {/* Add Note Form */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}>
          <div className="space-y-3">
            <textarea
              value={newNote.text}
              onChange={(e) => setNewNote({ ...newNote, text: e.target.value })}
              placeholder="Add a note from this review..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--scout-border)' }}
            />
            <div className="flex items-center justify-between">
              <select
                value={newNote.type}
                onChange={(e) => setNewNote({ ...newNote, type: e.target.value })}
                className="border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                {NOTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <button
                onClick={handleAddNote}
                disabled={!newNote.text.trim() || saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'var(--scout-trail)' }}
              >
                {saving ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Loading notes...
            </p>
          ) : notes.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--scout-earth-light)' }}>
              No notes yet. Add your first note above.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Unresolved Notes */}
              {unresolvedNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-sunset)' }}>
                    OPEN ({unresolvedNotes.length})
                  </h4>
                  <div className="space-y-2">
                    {unresolvedNotes.map(note => (
                      <div
                        key={note.note_id}
                        className="p-3 rounded-lg border"
                        style={{ borderColor: 'var(--scout-border)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: `${getNoteTypeStyle(note.note_type)}15`,
                                color: getNoteTypeStyle(note.note_type),
                              }}
                            >
                              {getNoteTypeLabel(note.note_type)}
                            </span>
                            <p className="text-sm mt-2" style={{ color: 'var(--scout-earth)' }}>
                              {note.note_text}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleResolved(note.note_id, note.is_resolved)}
                              className="p-1 hover:bg-green-50 rounded"
                              title="Mark resolved"
                            >
                              <svg className="w-4 h-4" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.note_id)}
                              className="p-1 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Notes */}
              {resolvedNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--scout-trail)' }}>
                    RESOLVED ({resolvedNotes.length})
                  </h4>
                  <div className="space-y-2">
                    {resolvedNotes.map(note => (
                      <div
                        key={note.note_id}
                        className="p-3 rounded-lg border opacity-60"
                        style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm line-through" style={{ color: 'var(--scout-earth-light)' }}>
                              {note.note_text}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                              {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggleResolved(note.note_id, note.is_resolved)}
                            className="p-1 hover:bg-yellow-50 rounded"
                            title="Reopen"
                          >
                            <svg className="w-4 h-4" style={{ color: 'var(--scout-sunset)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
