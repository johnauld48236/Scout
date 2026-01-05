'use client'

import { useState, useCallback } from 'react'
import { DEFAULT_RESEARCH_CATEGORIES, type ResearchCategory, type ResearchFinding, type ResearchResponse } from '@/lib/ai/context/types'

interface AIResearchModalProps {
  isOpen: boolean
  onClose: () => void
  companyName: string
  domain?: string
  onApplyResearch: (findings: ResearchFinding[]) => void
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

type ResearchStep = 'configure' | 'researching' | 'review'

export function AIResearchModal({ isOpen, onClose, companyName, domain, onApplyResearch }: AIResearchModalProps) {
  const [step, setStep] = useState<ResearchStep>('configure')
  const [categories, setCategories] = useState<ResearchCategory[]>(DEFAULT_RESEARCH_CATEGORIES)
  const [customPrompts, setCustomPrompts] = useState<string[]>([])
  const [newPrompt, setNewPrompt] = useState('')
  const [research, setResearch] = useState<ResearchResponse | null>(null)
  const [findings, setFindings] = useState<ResearchFinding[]>([])
  const [editingFinding, setEditingFinding] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(c =>
      c.id === categoryId ? { ...c, enabled: !c.enabled } : c
    ))
  }, [])

  const addCustomPrompt = useCallback(() => {
    if (newPrompt.trim()) {
      setCustomPrompts(prev => [...prev, newPrompt.trim()])
      setNewPrompt('')
    }
  }, [newPrompt])

  const removeCustomPrompt = useCallback((index: number) => {
    setCustomPrompts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const startResearch = useCallback(async () => {
    setStep('researching')
    setError(null)

    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          domain,
          categories,
          customPrompts
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Research failed')
      }

      const data = await response.json()
      setResearch(data.research)
      setFindings(data.research.findings)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Research failed')
      setStep('configure')
    }
  }, [companyName, domain, categories, customPrompts])

  const updateFindingStatus = useCallback((findingId: string, status: 'accepted' | 'rejected') => {
    setFindings(prev => prev.map(f =>
      f.id === findingId ? { ...f, status } : f
    ))
  }, [])

  const startEditFinding = useCallback((finding: ResearchFinding) => {
    setEditingFinding(finding.id)
    setEditContent(finding.editedContent || finding.content)
  }, [])

  const saveEditFinding = useCallback((findingId: string) => {
    setFindings(prev => prev.map(f =>
      f.id === findingId ? { ...f, status: 'edited', editedContent: editContent } : f
    ))
    setEditingFinding(null)
    setEditContent('')
  }, [editContent])

  const cancelEdit = useCallback(() => {
    setEditingFinding(null)
    setEditContent('')
  }, [])

  const applyAcceptedFindings = useCallback(() => {
    const accepted = findings.filter(f => f.status === 'accepted' || f.status === 'edited')
    onApplyResearch(accepted)
    onClose()
  }, [findings, onApplyResearch, onClose])

  const acceptAllFindings = useCallback(() => {
    setFindings(prev => prev.map(f => ({ ...f, status: 'accepted' as const })))
  }, [])

  if (!isOpen) return null

  const acceptedCount = findings.filter(f => f.status === 'accepted' || f.status === 'edited').length
  const enabledCategoriesCount = categories.filter(c => c.enabled).length

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[10vh]">
        <div className="relative w-full max-w-3xl rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">AI Research</h2>
                <p className="text-sm text-zinc-500">{companyName}{domain && ` (${domain})`}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <XIcon className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Configure Step */}
            {step === 'configure' && (
              <div className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Research Categories */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Research Categories</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => toggleCategory(category.id)}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          category.enabled
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            category.enabled
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}>
                            {category.enabled && <CheckIcon className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 ml-6">{category.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Prompts */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">Custom Research Questions</h3>
                  <p className="text-xs text-zinc-500 mb-2">Add specific questions you want researched</p>

                  {/* Existing prompts */}
                  {customPrompts.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {customPrompts.map((prompt, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                          <MagnifyingGlassIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                          <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{prompt}</span>
                          <button
                            onClick={() => removeCustomPrompt(i)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <XIcon className="w-4 h-4 text-zinc-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new prompt */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomPrompt()}
                      placeholder="e.g., What ERP systems do they use?"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addCustomPrompt}
                      disabled={!newPrompt.trim()}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Researching Step */}
            {step === 'researching' && (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
                  <MagnifyingGlassIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                  Researching {companyName}...
                </h3>
                <p className="text-sm text-zinc-500">
                  Searching the web and analyzing results
                </p>
                <div className="mt-6 flex justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && research && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Research Summary</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{research.summary}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500">
                    {findings.length} findings | {acceptedCount} accepted
                  </p>
                  <button
                    onClick={acceptAllFindings}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Accept all
                  </button>
                </div>

                {/* Findings */}
                <div className="space-y-3">
                  {findings.map(finding => (
                    <div
                      key={finding.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        finding.status === 'accepted' || finding.status === 'edited'
                          ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20'
                          : finding.status === 'rejected'
                          ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-50'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-500 uppercase">{finding.categoryName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              finding.confidence === 'high'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : finding.confidence === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                            }`}>
                              {finding.confidence}
                            </span>
                            {finding.status === 'edited' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                edited
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-zinc-900 dark:text-zinc-100">{finding.title}</h4>

                          {editingFinding === finding.id ? (
                            <div className="mt-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveEditFinding(finding.id)}
                                  className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1 text-xs font-medium rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {finding.editedContent || finding.content}
                            </p>
                          )}
                        </div>

                        {editingFinding !== finding.id && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateFindingStatus(finding.id, 'accepted')}
                              className={`p-2 rounded-lg transition-colors ${
                                finding.status === 'accepted'
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400'
                              }`}
                              title="Accept"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEditFinding(finding)}
                              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400"
                              title="Edit"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateFindingStatus(finding.id, 'rejected')}
                              className={`p-2 rounded-lg transition-colors ${
                                finding.status === 'rejected'
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400'
                              }`}
                              title="Reject"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            {step === 'configure' && (
              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={startResearch}
                  disabled={enabledCategoriesCount === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Start Research
                </button>
              </div>
            )}

            {step === 'review' && (
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('configure')}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Research Again
                </button>
                <button
                  onClick={applyAcceptedFindings}
                  disabled={acceptedCount === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Apply {acceptedCount} Finding{acceptedCount !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
