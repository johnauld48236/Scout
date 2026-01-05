'use client'

import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface ScoutAIResearchButtonProps {
  onClick: () => void
  isLoading?: boolean
  loadingText?: string
  children?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Scout AI branded research button
 * Use this for any AI-assisted research/generation features throughout the platform
 */
export function ScoutAIResearchButton({
  onClick,
  isLoading = false,
  loadingText = 'Scout AI is working...',
  children = 'Start Scout AI Research',
  disabled = false,
  className = '',
}: ScoutAIResearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60 ${className}`}
      style={{
        background: isLoading || disabled
          ? 'var(--scout-earth-light)'
          : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
        boxShadow: isLoading || disabled ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
      }}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <ScoutAIIcon size={22} className="text-white" />
          <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
            {children}
          </span>
        </>
      )}
    </button>
  )
}

/**
 * Smaller Scout AI button for inline use
 */
export function ScoutAIInlineButton({
  onClick,
  isLoading = false,
  children = 'AI Suggest',
  disabled = false,
}: {
  onClick: () => void
  isLoading?: boolean
  children?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60"
      style={{
        background: isLoading || disabled
          ? 'var(--scout-earth-light)'
          : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
      }}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <ScoutAIIcon size={16} className="text-white" />
      )}
      <span>{children}</span>
    </button>
  )
}
