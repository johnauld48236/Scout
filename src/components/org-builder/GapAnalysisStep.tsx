'use client'

import { useState, useEffect } from 'react'
import { BusinessUnit, ContactToPlace } from './OrgBuilderWizard'
import { SALES_METHODOLOGIES, SalesMethodologyType } from '@/lib/ai/context/company-profile'

interface CompanyProfile {
  sales_methodology?: SalesMethodologyType
  custom_methodology_criteria?: string[]
  products_services?: string
  target_verticals?: string[]
  key_stakeholder_roles?: string[]
}

interface Account {
  account_name: string
  industry?: string
  employee_count?: string
}

interface Gap {
  title: string
  department?: string
  businessUnitId?: string
  roleType: string
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  added: boolean
}

interface GapAnalysisStepProps {
  account: Account
  contacts: ContactToPlace[]
  businessUnits: BusinessUnit[]
  companyProfile: CompanyProfile | null
  methodology: SalesMethodologyType
  gaps: Gap[]
  onUpdateGaps: (gaps: Gap[]) => void
}

const ROLE_COLORS: Record<string, string> = {
  'Economic_Buyer': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Technical_Buyer': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Champion': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Influencer': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Blocker': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Coach': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  'End_User': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
}

export function GapAnalysisStep({
  account,
  contacts,
  businessUnits,
  companyProfile,
  methodology,
  gaps,
  onUpdateGaps,
}: GapAnalysisStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)

  const methodologyInfo = SALES_METHODOLOGIES[methodology]

  // Calculate coverage by role type
  const coverageByRole = () => {
    const placed = contacts.filter(c => c.placed && c.roleType)
    const coverage: Record<string, number> = {}
    placed.forEach(c => {
      if (c.roleType) {
        coverage[c.roleType] = (coverage[c.roleType] || 0) + 1
      }
    })
    return coverage
  }

  const coverage = coverageByRole()

  // Get required roles based on methodology
  const getRequiredRoles = (): Array<{ role: string; required: boolean; description: string }> => {
    if (methodology === 'MEDDICC' || methodology === 'MEDDPICC') {
      return [
        { role: 'Economic_Buyer', required: true, description: 'Controls the budget and final purchase decision' },
        { role: 'Champion', required: true, description: 'Internal advocate who sells on your behalf' },
        { role: 'Technical_Buyer', required: true, description: 'Evaluates technical fit and requirements' },
        { role: 'Influencer', required: false, description: 'Shapes opinions of decision makers' },
        { role: 'Coach', required: false, description: 'Provides inside information and guidance' },
      ]
    }
    if (methodology === 'BANT') {
      return [
        { role: 'Economic_Buyer', required: true, description: 'Has budget authority' },
        { role: 'Technical_Buyer', required: false, description: 'Evaluates need and fit' },
        { role: 'Influencer', required: false, description: 'Influences the timeline' },
      ]
    }
    if (methodology === 'Challenger') {
      return [
        { role: 'Champion', required: true, description: 'Key stakeholder to teach and influence' },
        { role: 'Economic_Buyer', required: true, description: 'Decision maker to take control with' },
        { role: 'Influencer', required: false, description: 'Others who need tailored messaging' },
      ]
    }
    return [
      { role: 'Economic_Buyer', required: true, description: 'Final decision maker' },
      { role: 'Champion', required: false, description: 'Internal advocate' },
    ]
  }

  const requiredRoles = getRequiredRoles()

  // Identify methodology gaps
  const identifyMethodologyGaps = (): Gap[] => {
    const newGaps: Gap[] = []

    requiredRoles.forEach(({ role, required, description }) => {
      if (required && (!coverage[role] || coverage[role] === 0)) {
        newGaps.push({
          title: role.replace('_', ' '),
          roleType: role,
          priority: 'High',
          reason: `${methodologyInfo.name} requires: ${description}`,
          added: false,
        })
      }
    })

    return newGaps
  }

  // Run AI analysis for domain-specific gaps
  const runAIAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/org-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: account.account_name,
          industry: account.industry,
          employeeCount: account.employee_count,
          stakeholders: contacts.filter(c => c.placed).map(c => ({
            full_name: c.name,
            title: c.title,
            department: c.department,
            role_type: c.roleType,
          })),
          pursuits: [],
          products: companyProfile?.products_services,
          methodology,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const aiGaps = (result.gaps || []).map((g: { suggested_title: string; department?: string; role_type?: string; priority?: string; why_important?: string }) => ({
          title: g.suggested_title,
          department: g.department,
          roleType: g.role_type?.replace(/ /g, '_') || 'Influencer',
          priority: g.priority || 'Medium',
          reason: g.why_important || 'AI suggested based on typical org structure',
          added: false,
        }))

        // Combine methodology gaps with AI gaps
        const methodologyGaps = identifyMethodologyGaps()
        const allGaps = [...methodologyGaps]

        // Add AI gaps that aren't duplicates
        aiGaps.forEach((aiGap: Gap) => {
          if (!allGaps.find(g => g.title.toLowerCase() === aiGap.title.toLowerCase())) {
            allGaps.push(aiGap)
          }
        })

        onUpdateGaps(allGaps)
        setHasAnalyzed(true)
      }
    } catch (error) {
      console.error('Gap analysis failed:', error)
      // Fall back to methodology gaps only
      onUpdateGaps(identifyMethodologyGaps())
      setHasAnalyzed(true)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Auto-run on first load if no gaps
  useEffect(() => {
    if (gaps.length === 0 && !hasAnalyzed && !isAnalyzing) {
      runAIAnalysis()
    }
  }, [])

  const toggleGapAdded = (index: number) => {
    const newGaps = [...gaps]
    newGaps[index] = { ...newGaps[index], added: !newGaps[index].added }
    onUpdateGaps(newGaps)
  }

  const addAllGaps = () => {
    onUpdateGaps(gaps.map(g => ({ ...g, added: true })))
  }

  const priorityOrder = { High: 0, Medium: 1, Low: 2 }
  const sortedGaps = [...gaps].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Gap Analysis
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Identify missing stakeholder coverage for {account.account_name}
          </p>
        </div>
        <button
          onClick={runAIAnalysis}
          disabled={isAnalyzing}
          className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors flex items-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-analyze
            </>
          )}
        </button>
      </div>

      {/* Coverage summary */}
      <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Current Coverage ({methodologyInfo.name})
        </h3>
        <div className="flex flex-wrap gap-3">
          {requiredRoles.map(({ role, required }) => {
            const count = coverage[role] || 0
            const hasGap = required && count === 0
            return (
              <div
                key={role}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  hasGap
                    ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : count > 0
                    ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <span className={`text-sm font-medium ${
                  hasGap ? 'text-red-700 dark:text-red-400' :
                  count > 0 ? 'text-green-700 dark:text-green-400' :
                  'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {role.replace('_', ' ')}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  hasGap ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' :
                  count > 0 ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                  'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {count}
                </span>
                {required && (
                  <span className="text-xs text-zinc-400">required</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Gap cards */}
      {isAnalyzing ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-zinc-500">Analyzing stakeholder gaps...</p>
        </div>
      ) : sortedGaps.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Identified Gaps ({sortedGaps.length})
            </h3>
            <button
              onClick={addAllGaps}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Add all as placeholders
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedGaps.map((gap, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all ${
                  gap.added
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {gap.title}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        gap.priority === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        gap.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {gap.priority}
                      </span>
                    </div>
                    {gap.department && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                        {gap.department}
                      </p>
                    )}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {gap.reason}
                    </p>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[gap.roleType] || 'bg-zinc-100 text-zinc-600'}`}>
                        {gap.roleType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleGapAdded(gaps.indexOf(gap))}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      gap.added
                        ? 'bg-green-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:bg-green-100 hover:text-green-600'
                    }`}
                    title={gap.added ? 'Remove from plan' : 'Add as placeholder'}
                  >
                    {gap.added ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400">
            No critical gaps identified. You have good stakeholder coverage!
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            <strong className="text-zinc-900 dark:text-zinc-100">{gaps.filter(g => g.added).length}</strong> gaps will be added as placeholders
          </span>
          <span className="text-zinc-400">
            Click &quot;Complete &amp; Save&quot; to create placeholder stakeholders
          </span>
        </div>
      </div>
    </div>
  )
}
