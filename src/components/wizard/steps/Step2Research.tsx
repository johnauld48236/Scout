'use client'

import { useState } from 'react'
import { type WizardData, type WizardResearchFinding } from '../types'
import { DEFAULT_RESEARCH_CATEGORIES, type ResearchCategory } from '@/lib/ai/context/types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step2Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step2Research({ data, updateData, onNext, onPrev }: Step2Props) {
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<ResearchCategory[]>(
    DEFAULT_RESEARCH_CATEGORIES.map(c => ({ ...c, enabled: true }))
  )

  const toggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId ? { ...c, enabled: !c.enabled } : c
      )
    )
  }

  const runResearch = async () => {
    setIsResearching(true)
    setError(null)

    try {
      // Extract domain from website
      let domain: string | undefined
      if (data.website) {
        domain = data.website
        if (domain.includes('://')) {
          domain = domain.split('://')[1]
        }
        domain = domain.split('/')[0]
      }

      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: data.accountName,
          domain,
          categories: categories.filter(c => c.enabled),
          customPrompts: [],
        }),
      })

      if (!response.ok) {
        throw new Error('Research failed')
      }

      const result = await response.json()

      // The API returns { success, research: { findings, summary, ... } }
      const research = result.research || result

      // Convert to wizard format
      const findings: WizardResearchFinding[] = (research.findings || []).map((f: WizardResearchFinding) => ({
        ...f,
        status: 'pending' as const,
      }))

      updateData({
        researchFindings: findings,
        researchSummary: research.summary,
      })
    } catch {
      setError('Failed to research company. Please try again.')
    } finally {
      setIsResearching(false)
    }
  }

  const updateFindingStatus = (findingId: string, status: WizardResearchFinding['status']) => {
    updateData({
      researchFindings: data.researchFindings.map(f =>
        f.id === findingId ? { ...f, status } : f
      ),
    })
  }

  const updateFindingContent = (findingId: string, editedContent: string) => {
    updateData({
      researchFindings: data.researchFindings.map(f =>
        f.id === findingId ? { ...f, editedContent, status: 'edited' as const } : f
      ),
    })
  }

  const acceptedFindings = data.researchFindings.filter(f => f.status === 'accepted' || f.status === 'edited')
  const pendingFindings = data.researchFindings.filter(f => f.status === 'pending')

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Company Research
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        AI will research {data.accountName} and gather intelligence. Review and approve findings.
      </p>

      {/* Research Categories - Chip style */}
      {data.researchFindings.length === 0 && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>
            Research Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-all border"
                style={{
                  backgroundColor: category.enabled ? 'var(--scout-sky)' : 'transparent',
                  borderColor: category.enabled ? 'var(--scout-sky)' : 'var(--scout-border)',
                  color: category.enabled ? '#ffffff' : 'var(--scout-earth-light)',
                }}
              >
                {category.enabled && (
                  <span className="mr-1">✓</span>
                )}
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scout AI Research Button - Distinctive styling */}
      {data.researchFindings.length === 0 && (
        <button
          onClick={runResearch}
          disabled={isResearching}
          className="w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
          style={{
            background: isResearching
              ? 'var(--scout-earth-light)'
              : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
            boxShadow: isResearching ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
          }}
        >
          {isResearching ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scout AI is researching {data.accountName}...</span>
            </>
          ) : (
            <>
              <ScoutAIIcon size={22} className="text-white" />
              <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                Start Scout AI Research
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', borderColor: 'var(--scout-clay)' }}>
          <p className="text-sm" style={{ color: 'var(--scout-clay)' }}>{error}</p>
        </div>
      )}

      {/* Research Summary */}
      {data.researchSummary && (
        <div className="mt-5 p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--scout-earth)' }}>Summary</h3>
          <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>{data.researchSummary}</p>
        </div>
      )}

      {/* Pending Findings */}
      {pendingFindings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-earth)' }}>
            Review Findings ({pendingFindings.length} pending)
          </h3>
          <div className="space-y-3">
            {pendingFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onAccept={() => updateFindingStatus(finding.id, 'accepted')}
                onReject={() => updateFindingStatus(finding.id, 'rejected')}
                onEdit={(content) => updateFindingContent(finding.id, content)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Accepted Findings */}
      {acceptedFindings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--scout-trail)' }}>
            Accepted Findings ({acceptedFindings.length})
          </h3>
          <div className="space-y-2">
            {acceptedFindings.map((finding) => (
              <div
                key={finding.id}
                className="p-3 rounded-lg border"
                style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)', borderColor: 'rgba(93, 122, 93, 0.3)' }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-medium" style={{ color: 'var(--scout-trail)' }}>{finding.categoryName}</span>
                    <p className="text-sm mt-1" style={{ color: 'var(--scout-earth)' }}>
                      {finding.editedContent || finding.content}
                    </p>
                  </div>
                  <button
                    onClick={() => updateFindingStatus(finding.id, 'pending')}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--scout-earth-light)' }}
                  >
                    Undo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-run Research */}
      {data.researchFindings.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => {
              updateData({ researchFindings: [], researchSummary: undefined })
            }}
            className="text-sm hover:underline"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            Clear and re-run research
          </button>
        </div>
      )}

      {/* Navigation Actions - Standard buttons */}
      <div className="mt-6 pt-4 flex justify-between border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm font-medium transition-colors hover:underline"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--scout-saddle)' }}
        >
          Continue to Stakeholders →
        </button>
      </div>
    </div>
  )
}

// Finding Card Component
function FindingCard({
  finding,
  onAccept,
  onReject,
  onEdit,
}: {
  finding: WizardResearchFinding
  onAccept: () => void
  onReject: () => void
  onEdit: (content: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(finding.content)

  const handleSaveEdit = () => {
    onEdit(editContent)
    setIsEditing(false)
  }

  return (
    <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--scout-sky)' }}>{finding.categoryName}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: finding.confidence === 'high'
              ? 'rgba(93, 122, 93, 0.15)'
              : finding.confidence === 'medium'
              ? 'rgba(210, 105, 30, 0.15)'
              : 'var(--scout-border)',
            color: finding.confidence === 'high'
              ? 'var(--scout-trail)'
              : finding.confidence === 'medium'
              ? 'var(--scout-sunset)'
              : 'var(--scout-earth-light)',
          }}
        >
          {finding.confidence} confidence
        </span>
      </div>

      <h4 className="font-medium text-sm mb-2" style={{ color: 'var(--scout-earth)' }}>{finding.title}</h4>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none border"
            style={{
              backgroundColor: 'var(--scout-white)',
              borderColor: 'var(--scout-border)',
              color: 'var(--scout-earth)',
            }}
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-white text-xs rounded-lg"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Save & Accept
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditContent(finding.content)
              }}
              className="px-3 py-1 text-xs"
              style={{ color: 'var(--scout-earth-light)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: 'var(--scout-earth-light)' }}>{finding.content}</p>

          {finding.sources.length > 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--scout-earth-light)', opacity: 0.7 }}>
              Sources: {finding.sources.slice(0, 2).join(', ')}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="px-3 py-1.5 text-white text-xs rounded-lg font-medium"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              Accept
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-xs rounded-lg font-medium border"
              style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
            >
              Edit
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-xs"
              style={{ color: 'var(--scout-clay)' }}
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  )
}
