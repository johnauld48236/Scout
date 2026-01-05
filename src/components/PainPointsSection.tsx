'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PainPointModal } from './PainPointModal'

interface Stakeholder {
  stakeholder_id: string
  full_name: string
  title?: string
}

interface Pursuit {
  pursuit_id: string
  name: string
}

interface EngagementLog {
  engagement_id: string
  title?: string
  engagement_date: string
  engagement_type: string
}

interface Bucket {
  bucket_id: string
  name: string
  color: string
}

interface PainPoint {
  pain_point_id: string
  account_plan_id: string
  pursuit_id?: string
  stakeholder_id?: string
  engagement_log_id?: string
  description: string
  verbatim?: string
  impact?: string
  severity?: string
  category?: string
  bant_dimension?: string
  source_type?: string
  source_date?: string
  status?: string
  created_at: string
  pursuits?: {
    name: string
  }
  stakeholders?: {
    full_name: string
  }
}

interface PainPointsSectionProps {
  accountPlanId: string
  painPoints: PainPoint[]
  stakeholders: Stakeholder[]
  pursuits: Pursuit[]
  engagements: EngagementLog[]
  buckets?: Bucket[]
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Critical' },
  significant: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Significant' },
  moderate: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Moderate' },
  minor: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', label: 'Minor' },
}

const BANT_LABELS: Record<string, string> = {
  B: 'Budget',
  A: 'Authority',
  N: 'Need',
  T: 'Timeline',
}

const CATEGORY_LABELS: Record<string, string> = {
  process: 'Process',
  tool: 'Tool/Tech',
  resource: 'Resource',
  compliance: 'Compliance',
  cost: 'Cost',
  time: 'Time',
  quality: 'Quality',
  integration: 'Integration',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function PainPointsSection({
  accountPlanId,
  painPoints,
  stakeholders,
  pursuits,
  engagements,
  buckets = [],
}: PainPointsSectionProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPainPoint, setEditingPainPoint] = useState<PainPoint | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'addressed'>('active')
  const [tagMenuOpen, setTagMenuOpen] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)

  const handleEdit = (painPoint: PainPoint) => {
    setEditingPainPoint(painPoint)
    setIsModalOpen(true)
  }

  const handleClose = () => {
    setIsModalOpen(false)
    setEditingPainPoint(null)
  }

  const handleMarkAddressed = async (painPointId: string) => {
    const supabase = createClient()
    await supabase
      .from('pain_points')
      .update({
        status: 'addressed',
        addressed_date: new Date().toISOString().split('T')[0],
      })
      .eq('pain_point_id', painPointId)
    router.refresh()
  }

  const handleReactivate = async (painPointId: string) => {
    const supabase = createClient()
    await supabase
      .from('pain_points')
      .update({
        status: 'active',
        addressed_date: null,
      })
      .eq('pain_point_id', painPointId)
    router.refresh()
  }

  const handleDelete = async (painPointId: string) => {
    if (!confirm('Delete this pain point?')) return
    try {
      await fetch(`/api/accounts/${accountPlanId}/pain-points/${painPointId}`, {
        method: 'DELETE',
      })
      router.refresh()
    } catch (error) {
      console.error('Failed to delete pain point:', error)
    }
  }

  const handleTagToBucket = async (painPointId: string, bucketId: string) => {
    setTagMenuOpen(null)
    try {
      await fetch(`/api/accounts/${accountPlanId}/buckets/${bucketId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'pain_point',
          item_id: painPointId,
        }),
      })
      router.refresh()
    } catch (error) {
      console.error('Error tagging to bucket:', error)
    }
  }

  // Filter and sort
  const filteredPainPoints = painPoints.filter(pp => {
    if (filter === 'active') return pp.status !== 'addressed'
    if (filter === 'addressed') return pp.status === 'addressed'
    return true
  })

  // Sort by severity (critical first), then by date
  const severityOrder = { critical: 0, significant: 1, moderate: 2, minor: 3 }
  const sortedPainPoints = [...filteredPainPoints].sort((a, b) => {
    const sevA = severityOrder[a.severity as keyof typeof severityOrder] ?? 2
    const sevB = severityOrder[b.severity as keyof typeof severityOrder] ?? 2
    if (sevA !== sevB) return sevA - sevB
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const activeCriticalCount = painPoints.filter(
    pp => pp.status !== 'addressed' && pp.severity === 'critical'
  ).length

  return (
    <section>
      {/* Header - Clickable to expand/collapse */}
      <div
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            style={{ color: 'var(--scout-earth-light)' }}
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}>
            Pain Points ({painPoints.filter(pp => pp.status !== 'addressed').length})
          </h3>
          {activeCriticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: 'rgba(169, 68, 66, 0.15)', color: 'var(--scout-clay)' }}>
              {activeCriticalCount} critical
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Filter Tabs - Compact */}
          <div className="flex rounded border overflow-hidden text-[10px]" style={{ borderColor: 'var(--scout-border)' }}>
            <button
              onClick={() => setFilter('active')}
              className={`px-2 py-0.5 ${filter === 'active' ? 'font-medium' : ''}`}
              style={{ backgroundColor: filter === 'active' ? 'var(--scout-parchment)' : 'white', color: 'var(--scout-earth)' }}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('addressed')}
              className={`px-2 py-0.5 border-l ${filter === 'addressed' ? 'font-medium' : ''}`}
              style={{ borderColor: 'var(--scout-border)', backgroundColor: filter === 'addressed' ? 'var(--scout-parchment)' : 'white', color: 'var(--scout-earth)' }}
            >
              Done
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 border-l ${filter === 'all' ? 'font-medium' : ''}`}
              style={{ borderColor: 'var(--scout-border)', backgroundColor: filter === 'all' ? 'var(--scout-parchment)' : 'white', color: 'var(--scout-earth)' }}
            >
              All
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-2 py-1 text-xs font-medium rounded"
            style={{ backgroundColor: 'var(--scout-sky)', color: 'white' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Content - Collapsible */}
      {isExpanded && (
      <div className="space-y-2">
        {sortedPainPoints.map((painPoint) => {
          const severity = SEVERITY_STYLES[painPoint.severity || 'moderate'] || SEVERITY_STYLES.moderate
          const isAddressed = painPoint.status === 'addressed'

          return (
            <div
              key={painPoint.pain_point_id}
              className={`rounded-lg p-2 group ${isAddressed ? 'opacity-60' : ''}`}
              style={{
                backgroundColor: painPoint.severity === 'critical' ? 'rgba(169, 68, 66, 0.08)'
                  : painPoint.severity === 'significant' ? 'rgba(210, 105, 30, 0.08)'
                  : 'var(--scout-parchment)',
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {/* Compact Header Row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: painPoint.severity === 'critical' ? 'var(--scout-clay)'
                          : painPoint.severity === 'significant' ? 'rgba(210, 105, 30, 0.2)'
                          : 'rgba(210, 105, 30, 0.15)',
                        color: painPoint.severity === 'critical' ? 'white'
                          : 'var(--scout-sunset)',
                      }}
                    >
                      {severity.label}
                    </span>
                    {painPoint.bant_dimension && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded font-bold"
                        style={{ backgroundColor: 'rgba(74, 144, 164, 0.15)', color: 'var(--scout-sky)' }}
                      >
                        {BANT_LABELS[painPoint.bant_dimension] || painPoint.bant_dimension}
                      </span>
                    )}
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--scout-earth)' }}>
                      {painPoint.description}
                    </span>
                    {painPoint.pursuits?.name && (
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--scout-earth-light)' }}>
                        {painPoint.pursuits.name}
                      </span>
                    )}
                  </div>

                  {/* Verbatim - only show first line */}
                  {painPoint.verbatim && (
                    <p className="text-[10px] mt-0.5 truncate italic" style={{ color: 'var(--scout-earth-light)' }}>
                      &ldquo;{painPoint.verbatim}&rdquo;
                    </p>
                  )}
                </div>

                {/* Actions - visible on hover */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleEdit(painPoint)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  {/* Tag to bucket */}
                  {buckets.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setTagMenuOpen(tagMenuOpen === painPoint.pain_point_id ? null : painPoint.pain_point_id)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        title="Tag to bucket"
                      >
                        <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-earth-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </button>
                      {tagMenuOpen === painPoint.pain_point_id && (
                        <div
                          className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg border z-10 min-w-32"
                          style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
                        >
                          {buckets.map(bucket => (
                            <button
                              key={bucket.bucket_id}
                              onClick={() => handleTagToBucket(painPoint.pain_point_id, bucket.bucket_id)}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: `var(--scout-${bucket.color})` }}
                              />
                              {bucket.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {isAddressed ? (
                    <button
                      onClick={() => handleReactivate(painPoint.pain_point_id)}
                      className="p-1 rounded hover:bg-orange-100 transition-colors"
                      title="Reactivate"
                    >
                      <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-sunset)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkAddressed(painPoint.pain_point_id)}
                      className="p-1 rounded hover:bg-green-100 transition-colors"
                      title="Mark as Addressed"
                    >
                      <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-trail)' }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(painPoint.pain_point_id)}
                    className="p-1 rounded hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: 'var(--scout-clay)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {sortedPainPoints.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
              {filter === 'addressed'
                ? 'No addressed pain points'
                : 'No pain points yet'}
            </p>
            {filter !== 'addressed' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs mt-1"
                style={{ color: 'var(--scout-sky)' }}
              >
                Capture first pain point →
              </button>
            )}
          </div>
        )}
      </div>
      )}

      <PainPointModal
        isOpen={isModalOpen}
        onClose={handleClose}
        accountPlanId={accountPlanId}
        pursuits={pursuits}
        stakeholders={stakeholders}
        engagements={engagements}
        painPoint={editingPainPoint}
      />
    </section>
  )
}
