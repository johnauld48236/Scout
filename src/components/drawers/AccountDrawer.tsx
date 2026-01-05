'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
}

const widthClasses = {
  sm: 'w-[380px]',
  md: 'w-[480px]',
  lg: 'w-[600px]',
  xl: 'w-[800px]',
}

export function AccountDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 'md',
  children,
  footer,
}: AccountDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const drawer = (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={`relative ${widthClasses[width]} h-full flex flex-col shadow-2xl animate-slide-in-right`}
        style={{ backgroundColor: 'var(--scout-white)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--scout-earth-light)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 px-6 py-4 border-t"
            style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-parchment)' }}
          >
            {footer}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  )

  // Use portal to render at document root
  if (typeof window !== 'undefined') {
    return createPortal(drawer, document.body)
  }

  return drawer
}

// Drawer Section Component for organizing content
export function DrawerSection({
  title,
  action,
  children,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-6 last:mb-0">
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'var(--scout-earth)' }}
            >
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// Drawer List Item Component
export function DrawerListItem({
  onClick,
  selected,
  children,
}: {
  onClick?: () => void
  selected?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all ${onClick ? 'cursor-pointer hover:border-amber-300' : ''}`}
      style={{
        backgroundColor: selected ? 'rgba(139, 69, 19, 0.05)' : 'var(--scout-parchment)',
        borderColor: selected ? 'var(--scout-saddle)' : 'var(--scout-border)',
      }}
    >
      {children}
    </div>
  )
}
