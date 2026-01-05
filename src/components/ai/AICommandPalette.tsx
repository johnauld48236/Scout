'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAI } from './AIContextProvider'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { ConversationMessage } from '@/lib/ai/context/types'

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
    </span>
  )
}

const QUICK_ACTIONS = [
  { label: 'Show at-risk pursuits', query: 'What pursuits are at risk or stalled?' },
  { label: 'Pipeline summary', query: 'Give me a quick pipeline health summary' },
  { label: 'Today\'s priorities', query: 'What should I focus on today?' },
  { label: 'Goal progress', query: 'How are we tracking against our 2026 goals?' },
]

export function AICommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette, navigation, openChatDrawer } = useAI()
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResponse(null)
      setError(null)
    }
  }, [isCommandPaletteOpen])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        closeCommandPalette()
      }
    }

    if (isCommandPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCommandPaletteOpen, closeCommandPalette])

  const handleSubmit = useCallback(async (q: string) => {
    if (!q.trim()) return

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          navigation,
          stream: false,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get response')
      }

      const data = await res.json()
      setResponse(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [navigation])

  const handleExpandToChat = useCallback(() => {
    closeCommandPalette()
    openChatDrawer(query || undefined)
  }, [closeCommandPalette, openChatDrawer, query])

  if (!isCommandPaletteOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[15vh]">
        <div
          ref={modalRef}
          className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border overflow-hidden"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          {/* Header with Scout AI branding */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b"
            style={{
              backgroundColor: 'var(--scout-saddle)',
              borderColor: 'var(--scout-saddle-hover)'
            }}
          >
            <ScoutAIIcon size={22} className="text-white" />
            <span
              className="text-white font-semibold text-sm tracking-wide"
              style={{ fontFamily: "'Bitter', Georgia, serif" }}
            >
              Scout AI
            </span>
            <span className="text-white/60 text-xs ml-1">— Read the terrain</span>
          </div>

          {/* Input area */}
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--scout-border)' }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(query)
                }
              }}
              placeholder="Ask anything about your sales data..."
              className="flex-1 bg-transparent placeholder-zinc-400 outline-none text-base"
              style={{ color: 'var(--scout-earth)' }}
              disabled={isLoading}
            />
            {isLoading && (
              <div style={{ color: 'var(--scout-saddle)' }}>
                <LoadingDots />
              </div>
            )}
            {!isLoading && query && (
              <button
                onClick={() => handleSubmit(query)}
                className="px-3 py-1.5 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: 'var(--scout-saddle)' }}
              >
                Ask
              </button>
            )}
          </div>

          {/* Quick actions (when no query) */}
          {!query && !response && !error && (
            <div className="p-4">
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--scout-earth-light)' }}>
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(action.query)
                      handleSubmit(action.query)
                    }}
                    className="text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--scout-parchment)',
                      color: 'var(--scout-earth)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--scout-border)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--scout-parchment)'}
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Context indicator */}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
                <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
                  Context: <span className="capitalize" style={{ color: 'var(--scout-earth)' }}>{navigation.page}</span>
                  {navigation.entityId && (
                    <span style={{ color: 'var(--scout-earth-light)' }}> ({navigation.entityType})</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Response area */}
          {response && (
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap" style={{ color: 'var(--scout-earth)' }}>
                  {response}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--scout-border)' }}>
                <button
                  onClick={handleExpandToChat}
                  className="text-sm font-medium"
                  style={{ color: 'var(--scout-sky)' }}
                >
                  Continue in full chat
                </button>
                <button
                  onClick={() => {
                    setResponse(null)
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="text-sm"
                  style={{ color: 'var(--scout-earth-light)' }}
                >
                  New question
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="p-4">
              <div
                className="rounded-lg p-3 text-sm"
                style={{
                  backgroundColor: 'rgba(169, 68, 66, 0.1)',
                  color: 'var(--scout-clay)'
                }}
              >
                {error}
              </div>
              <button
                onClick={() => {
                  setError(null)
                  inputRef.current?.focus()
                }}
                className="mt-3 text-sm"
                style={{ color: 'var(--scout-earth-light)' }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Footer */}
          <div
            className="px-4 py-2 border-t flex items-center justify-between text-xs"
            style={{
              backgroundColor: 'var(--scout-parchment)',
              borderColor: 'var(--scout-border)',
              color: 'var(--scout-earth-light)'
            }}
          >
            <span>
              <kbd
                className="px-1.5 py-0.5 rounded font-mono text-xs"
                style={{
                  backgroundColor: 'var(--scout-border)',
                  color: 'var(--scout-earth)'
                }}
              >
                Enter
              </kbd>
              {' '}to send
            </span>
            <span>
              <kbd
                className="px-1.5 py-0.5 rounded font-mono text-xs"
                style={{
                  backgroundColor: 'var(--scout-border)',
                  color: 'var(--scout-earth)'
                }}
              >
                Esc
              </kbd>
              {' '}to close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
