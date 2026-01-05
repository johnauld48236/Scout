'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { NavigationContext, ConversationMessage } from '@/lib/ai/context/types'

interface AIContextType {
  // Navigation context
  navigation: NavigationContext

  // Command palette state
  isCommandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  // Chat drawer state
  isChatDrawerOpen: boolean
  openChatDrawer: (initialMessage?: string) => void
  closeChatDrawer: () => void

  // Chat state
  chatHistory: ConversationMessage[]
  addChatMessage: (message: ConversationMessage) => void
  clearChatHistory: () => void
  initialChatMessage: string | null

  // Loading state
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const AIContext = createContext<AIContextType | null>(null)

// Parse navigation from pathname (client-side version)
function parseNavigationFromPath(pathname: string): NavigationContext {
  const segments = pathname.split('/').filter(Boolean)

  let page: NavigationContext['page'] = 'other'
  let entityType: NavigationContext['entityType']
  let entityId: NavigationContext['entityId']

  if (segments.length === 0 || pathname === '/') {
    page = 'dashboard'
  } else {
    const firstSegment = segments[0]

    switch (firstSegment) {
      case 'goals':
        page = 'goals'
        if (segments[1] && segments[1] !== 'new') {
          entityType = 'goal'
          entityId = segments[1]
        }
        break

      case 'campaigns':
        page = 'campaigns'
        if (segments[1]) {
          entityType = 'campaign'
          entityId = segments[1]
        }
        break

      case 'accounts':
        page = 'accounts'
        if (segments[1]) {
          entityType = 'account_plan'
          entityId = segments[1]
        }
        break

      case 'pursuits':
        page = 'pursuits'
        if (segments[1]) {
          entityType = 'pursuit'
          entityId = segments[1]
        }
        break

      case 'stakeholders':
        page = 'stakeholders'
        if (segments[1]) {
          entityType = 'stakeholder'
          entityId = segments[1]
        }
        break

      case 'actions':
        page = 'actions'
        if (segments[1]) {
          entityType = 'action_item'
          entityId = segments[1]
        }
        break

      case 'tam':
        if (segments[1] === 'gaps') {
          page = 'tam-gaps'
        } else if (segments[1] === 'list') {
          page = 'tam-list'
        } else if (segments[1]) {
          page = 'tam'
          entityType = 'tam_account'
          entityId = segments[1]
        } else {
          page = 'tam'
        }
        break
    }
  }

  return { page, entityType, entityId }
}

export function AIContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Parse navigation from current URL
  const navigation = useMemo(() => parseNavigationFromPath(pathname), [pathname])

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Chat drawer state
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false)
  const [initialChatMessage, setInitialChatMessage] = useState<string | null>(null)

  // Chat history
  const [chatHistory, setChatHistory] = useState<ConversationMessage[]>([])

  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Command palette handlers
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), [])
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen(prev => !prev), [])

  // Chat drawer handlers
  const openChatDrawer = useCallback((initialMessage?: string) => {
    setInitialChatMessage(initialMessage || null)
    setIsChatDrawerOpen(true)
  }, [])

  const closeChatDrawer = useCallback(() => {
    setIsChatDrawerOpen(false)
    setInitialChatMessage(null)
  }, [])

  // Chat history handlers
  const addChatMessage = useCallback((message: ConversationMessage) => {
    setChatHistory(prev => [...prev, message])
  }, [])

  const clearChatHistory = useCallback(() => {
    setChatHistory([])
  }, [])

  // Keyboard shortcut: Cmd+K or Ctrl+K for command palette
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        toggleCommandPalette()
      }

      // Escape to close
      if (event.key === 'Escape') {
        if (isCommandPaletteOpen) {
          closeCommandPalette()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCommandPaletteOpen, toggleCommandPalette, closeCommandPalette])

  // Clear chat when navigation changes significantly
  useEffect(() => {
    // Don't clear on every navigation, only when changing entity types
  }, [navigation.page])

  const value: AIContextType = {
    navigation,
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    isChatDrawerOpen,
    openChatDrawer,
    closeChatDrawer,
    chatHistory,
    addChatMessage,
    clearChatHistory,
    initialChatMessage,
    isLoading,
    setIsLoading,
  }

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const context = useContext(AIContext)
  if (!context) {
    throw new Error('useAI must be used within an AIContextProvider')
  }
  return context
}
