'use client'

import { useAI } from './AIContextProvider'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

export function ScoutAIButton() {
  const { openCommandPalette } = useAI()

  return (
    <button
      onClick={openCommandPalette}
      className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all z-30 text-white"
      style={{ backgroundColor: 'var(--scout-saddle)' }}
      title="Open Scout AI (Cmd+K)"
    >
      <ScoutAIIcon size={20} className="text-white" />
      <span
        className="font-semibold text-sm tracking-wide"
        style={{ fontFamily: "'Bitter', Georgia, serif" }}
      >
        Scout AI
      </span>
      <kbd className="ml-1 px-1.5 py-0.5 rounded text-xs bg-white/20 font-mono">
        ⌘K
      </kbd>
    </button>
  )
}
