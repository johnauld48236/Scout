'use client'

import { useState } from 'react'
import { type WizardData } from '../types'
import { ScoutAIIcon } from '@/components/ui/scout-logo'

interface Step6Props {
  data: WizardData
  updateData: (updates: Partial<WizardData>) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step6Strategy({ data, updateData, onNext, onPrev }: Step6Props) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [newObjective, setNewObjective] = useState('')
  const [newRisk, setNewRisk] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

  const generateStrategy = async () => {
    setIsGenerating(true)
    setFeedbackMessage(null)
    try {
      // Build comprehensive context
      const acceptedResearch = data.researchFindings
        .filter(f => f.status === 'accepted' || f.status === 'edited')
        .map(f => f.editedContent || f.content)
        .join('\n- ')

      const stakeholderSummary = data.stakeholders
        .map(s => `${s.full_name || 'TBD'} (${s.title || 'Unknown title'}) - ${s.role_type}, ${s.sentiment || 'Unknown sentiment'}`)
        .join('\n- ')

      const opportunitySummary = data.pursuits
        .map(p => `${p.name}: ${p.description || ''} (${p.estimated_value ? `$${p.estimated_value.toLocaleString()}` : 'Value TBD'})`)
        .join('\n- ')

      const competitorSummary = data.competitors
        .map(c => `${c.name} (${c.status}): ${c.strategy || 'No strategy noted'}`)
        .join('\n- ')

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate an account strategy for ${data.accountName}. Create:
1. An executive summary (2-3 paragraphs) of our approach to winning this account
2. 3-5 key strategic objectives we should pursue
3. 2-4 risk factors to monitor

Context:
COMPANY: ${data.accountName}
INDUSTRY: ${data.industry || 'Unknown'}
DESCRIPTION: ${data.description || 'N/A'}

RESEARCH FINDINGS:
- ${acceptedResearch || 'No research conducted'}

STAKEHOLDERS MAPPED:
- ${stakeholderSummary || 'No stakeholders mapped'}

OPPORTUNITIES IDENTIFIED:
- ${opportunitySummary || 'No opportunities identified'}

COMPETITIVE LANDSCAPE:
- ${competitorSummary || 'No competitors mapped'}

Format your response as:
STRATEGY:
[Your 2-3 paragraph strategy here]

OBJECTIVES:
1. [Objective 1]
2. [Objective 2]
...

RISKS:
1. [Risk 1]
2. [Risk 2]
...`,
          context: {
            navigation: { page: 'accounts' },
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const content = result.content

        // Parse strategy
        const strategyMatch = content.match(/STRATEGY:\s*([\s\S]*?)(?=OBJECTIVES:|$)/i)
        const strategy = strategyMatch?.[1]?.trim() || ''

        // Parse objectives
        const objectivesMatch = content.match(/OBJECTIVES:\s*([\s\S]*?)(?=RISKS:|$)/i)
        const objectivesText = objectivesMatch?.[1] || ''
        const objectives = objectivesText
          .split(/\n/)
          .map((line: string) => line.replace(/^[\d\-.*]+\s*/, '').trim())
          .filter((line: string) => line.length > 0)

        // Parse risks
        const risksMatch = content.match(/RISKS:\s*([\s\S]*?)$/i)
        const risksText = risksMatch?.[1] || ''
        const risks = risksText
          .split(/\n/)
          .map((line: string) => line.replace(/^[\d\-.*]+\s*/, '').trim())
          .filter((line: string) => line.length > 0)

        if (strategy || objectives.length > 0 || risks.length > 0) {
          updateData({
            accountStrategy: strategy,
            keyObjectives: objectives,
            riskFactors: risks,
          })
          setFeedbackMessage({
            type: 'success',
            text: `Generated strategy with ${objectives.length} objectives and ${risks.length} risk factors`,
          })
        } else {
          setFeedbackMessage({
            type: 'warning',
            text: 'Could not parse strategy. Try adding more research context or click again to retry.',
          })
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to generate strategy. Please try again.',
        })
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const addObjective = () => {
    if (!newObjective.trim()) return
    updateData({
      keyObjectives: [...(data.keyObjectives || []), newObjective.trim()],
    })
    setNewObjective('')
  }

  const removeObjective = (index: number) => {
    updateData({
      keyObjectives: data.keyObjectives?.filter((_, i) => i !== index),
    })
  }

  const addRisk = () => {
    if (!newRisk.trim()) return
    updateData({
      riskFactors: [...(data.riskFactors || []), newRisk.trim()],
    })
    setNewRisk('')
  }

  const removeRisk = (index: number) => {
    updateData({
      riskFactors: data.riskFactors?.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border p-4" style={{ borderColor: 'var(--scout-border)' }}>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--scout-earth)' }}>
        Account Strategy
      </h2>
      <p className="text-sm mb-4" style={{ color: 'var(--scout-earth-light)' }}>
        Define your overall approach to winning {data.accountName}.
      </p>

      {/* Scout AI Button */}
      {!data.accountStrategy && (
        <button
          onClick={generateStrategy}
          disabled={isGenerating}
          className="w-full mb-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-3 text-white disabled:opacity-60"
          style={{
            background: isGenerating
              ? 'var(--scout-earth-light)'
              : 'linear-gradient(135deg, var(--scout-saddle) 0%, var(--scout-sunset) 100%)',
            boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(139, 69, 19, 0.3)',
          }}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scout AI crafting strategy...</span>
            </>
          ) : (
            <>
              <ScoutAIIcon size={22} className="text-white" />
              <span style={{ fontFamily: "'Bitter', Georgia, serif" }}>
                Scout AI: Generate Strategy
              </span>
            </>
          )}
        </button>
      )}

      {/* Feedback Message */}
      {feedbackMessage && (
        <div
          className="mb-4 p-3 rounded-lg text-sm border"
          style={{
            backgroundColor: feedbackMessage.type === 'success'
              ? 'rgba(93, 122, 93, 0.1)'
              : feedbackMessage.type === 'warning'
              ? 'rgba(210, 105, 30, 0.1)'
              : 'rgba(169, 68, 66, 0.1)',
            borderColor: feedbackMessage.type === 'success'
              ? 'rgba(93, 122, 93, 0.3)'
              : feedbackMessage.type === 'warning'
              ? 'rgba(210, 105, 30, 0.3)'
              : 'rgba(169, 68, 66, 0.3)',
            color: feedbackMessage.type === 'success'
              ? 'var(--scout-trail)'
              : feedbackMessage.type === 'warning'
              ? 'var(--scout-sunset)'
              : 'var(--scout-clay)',
          }}
        >
          {feedbackMessage.text}
        </div>
      )}

      {/* Strategy Text */}
      <div className="mb-5">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
          Account Strategy
        </label>
        <textarea
          value={data.accountStrategy || ''}
          onChange={(e) => updateData({ accountStrategy: e.target.value })}
          placeholder="Describe your overall approach to this account..."
          rows={6}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none"
          style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)', backgroundColor: 'var(--scout-white)' }}
        />
        {data.accountStrategy && (
          <button
            onClick={generateStrategy}
            disabled={isGenerating}
            className="mt-2 text-sm hover:underline"
            style={{ color: 'var(--scout-sky)' }}
          >
            {isGenerating ? 'Regenerating...' : 'Regenerate with Scout AI'}
          </button>
        )}
      </div>

      {/* Key Objectives */}
      <div className="mb-5">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
          Key Objectives
        </label>
        {data.keyObjectives && data.keyObjectives.length > 0 && (
          <ul className="space-y-2 mb-3">
            {data.keyObjectives.map((objective, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
              >
                <span className="font-medium" style={{ color: 'var(--scout-sky)' }}>{index + 1}.</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--scout-earth)' }}>{objective}</span>
                <button
                  onClick={() => removeObjective(index)}
                  className="hover:opacity-70"
                  style={{ color: 'var(--scout-clay)' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addObjective()}
            placeholder="Add an objective..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          />
          <button
            onClick={addObjective}
            disabled={!newObjective.trim()}
            className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--scout-trail)' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="mb-5">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--scout-earth-light)' }}>
          Risk Factors
        </label>
        {data.riskFactors && data.riskFactors.length > 0 && (
          <ul className="space-y-2 mb-3">
            {data.riskFactors.map((risk, index) => (
              <li
                key={index}
                className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ backgroundColor: 'rgba(169, 68, 66, 0.08)', borderColor: 'rgba(169, 68, 66, 0.2)' }}
              >
                <span style={{ color: 'var(--scout-clay)' }}>
                  <svg className="h-4 w-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </span>
                <span className="flex-1 text-sm" style={{ color: 'var(--scout-earth)' }}>{risk}</span>
                <button
                  onClick={() => removeRisk(index)}
                  className="hover:opacity-70"
                  style={{ color: 'var(--scout-clay)' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newRisk}
            onChange={(e) => setNewRisk(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRisk()}
            placeholder="Add a risk factor..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-earth)' }}
          />
          <button
            onClick={addRisk}
            disabled={!newRisk.trim()}
            className="px-4 py-2 text-white text-sm rounded-lg font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--scout-sunset)' }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Navigation */}
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
          Continue to Actions →
        </button>
      </div>
    </div>
  )
}
