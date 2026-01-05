'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAI } from './AIContextProvider'
import { ScoutAIIcon } from '@/components/ui/scout-logo'
import type { ConversationMessage } from '@/lib/ai/context/types'

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

export function AIChatDrawer() {
  const {
    isChatDrawerOpen,
    closeChatDrawer,
    navigation,
    chatHistory,
    addChatMessage,
    clearChatHistory,
    initialChatMessage,
  } = useAI()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, streamingContent, scrollToBottom])

  // Handle initial message from command palette
  useEffect(() => {
    if (isChatDrawerOpen && initialChatMessage) {
      setInput(initialChatMessage)
      // Auto-submit after a brief delay
      setTimeout(() => {
        handleSubmit(initialChatMessage)
      }, 100)
    }
  }, [isChatDrawerOpen, initialChatMessage])

  // Focus input when opened
  useEffect(() => {
    if (isChatDrawerOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isChatDrawerOpen])

  const handleSubmit = useCallback(async (messageOverride?: string) => {
    const message = messageOverride || input.trim()
    if (!message || isLoading) return

    // Add user message
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    addChatMessage(userMessage)
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    try {
      // Use streaming for real-time response
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          navigation,
          conversationHistory: chatHistory,
          stream: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  fullContent += parsed.content
                  setStreamingContent(fullContent)
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
      }
      addChatMessage(assistantMessage)
      setStreamingContent('')
    } catch (error) {
      console.error('Chat error:', error)
      addChatMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, navigation, chatHistory, addChatMessage])

  if (!isChatDrawerOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closeChatDrawer}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl z-50 flex flex-col">
        {/* Header with Scout AI branding */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          <div className="flex items-center gap-2">
            <ScoutAIIcon size={22} className="text-white" />
            <h2
              className="font-semibold text-white tracking-wide"
              style={{ fontFamily: "'Bitter', Georgia, serif" }}
            >
              Scout AI
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {chatHistory.length > 0 && (
              <button
                onClick={clearChatHistory}
                className="text-xs text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10"
              >
                Clear
              </button>
            )}
            <button
              onClick={closeChatDrawer}
              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Context indicator */}
        <div
          className="px-4 py-2 border-b"
          style={{
            backgroundColor: 'var(--scout-parchment)',
            borderColor: 'var(--scout-border)'
          }}
        >
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            Context: <span className="capitalize" style={{ color: 'var(--scout-earth)' }}>{navigation.page}</span>
            {navigation.entityId && (
              <span style={{ color: 'var(--scout-earth-light)' }}> ({navigation.entityType})</span>
            )}
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 && !streamingContent && (
            <div className="text-center py-8" style={{ color: 'var(--scout-earth-light)' }}>
              <div className="mx-auto mb-3 w-8 h-8" style={{ color: 'var(--scout-border)' }}>
                <ScoutAIIcon size={32} />
              </div>
              <p className="text-sm">Ask me anything about your sales data</p>
              <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                I have context about your current page
              </p>
            </div>
          )}

          {chatHistory.map((message, i) => (
            <div
              key={i}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(139, 69, 19, 0.15)', color: 'var(--scout-saddle)' }}
                >
                  <ScoutAIIcon size={16} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'text-white'
                    : ''
                }`}
                style={{
                  backgroundColor: message.role === 'user'
                    ? 'var(--scout-saddle)'
                    : 'var(--scout-parchment)',
                  color: message.role === 'user'
                    ? '#ffffff'
                    : 'var(--scout-earth)'
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--scout-border)', color: 'var(--scout-earth-light)' }}
                >
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming response */}
          {streamingContent && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(139, 69, 19, 0.15)', color: 'var(--scout-saddle)' }}
              >
                <ScoutAIIcon size={16} />
              </div>
              <div
                className="max-w-[80%] rounded-lg px-3 py-2"
                style={{
                  backgroundColor: 'var(--scout-parchment)',
                  color: 'var(--scout-earth)'
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <div className="flex gap-3 justify-start">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(139, 69, 19, 0.15)', color: 'var(--scout-saddle)' }}
              >
                <ScoutAIIcon size={16} />
              </div>
              <div
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: 'var(--scout-parchment)' }}
              >
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--scout-saddle)', animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--scout-saddle)', animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--scout-saddle)', animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Ask a question..."
              rows={1}
              className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--scout-border)',
                color: 'var(--scout-earth)',
                '--tw-ring-color': 'var(--scout-sky)'
              } as React.CSSProperties}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--scout-saddle)' }}
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--scout-earth-light)' }}>
            Press{' '}
            <kbd
              className="px-1 py-0.5 rounded font-mono"
              style={{
                backgroundColor: 'var(--scout-parchment)',
                color: 'var(--scout-earth)'
              }}
            >
              Enter
            </kbd>
            {' '}to send,{' '}
            <kbd
              className="px-1 py-0.5 rounded font-mono"
              style={{
                backgroundColor: 'var(--scout-parchment)',
                color: 'var(--scout-earth)'
              }}
            >
              Shift+Enter
            </kbd>
            {' '}for new line
          </p>
        </div>
      </div>
    </>
  )
}
