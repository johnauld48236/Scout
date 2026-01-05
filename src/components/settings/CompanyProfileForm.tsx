'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyProfile } from '@/lib/ai/context/company-profile'
import { DEFAULT_COMPANY_PROFILE, SALES_METHODOLOGIES, type SalesMethodologyType } from '@/lib/ai/context/company-profile'

interface CompanyProfileFormProps {
  initialProfile: CompanyProfile | null
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  )
}

export function CompanyProfileForm({ initialProfile }: CompanyProfileFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [profile, setProfile] = useState<CompanyProfile>(
    initialProfile || DEFAULT_COMPANY_PROFILE
  )

  // Tag input handlers
  const [roleInput, setRoleInput] = useState('')
  const [customCriteriaInput, setCustomCriteriaInput] = useState('')

  const updateField = useCallback(<K extends keyof CompanyProfile>(field: K, value: CompanyProfile[K]) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }, [])

  const addToArray = useCallback((field: 'key_stakeholder_roles' | 'custom_methodology_criteria', value: string) => {
    if (!value.trim()) return
    setProfile(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()]
    }))
    setSaveSuccess(false)
  }, [])

  const removeFromArray = useCallback((field: 'key_stakeholder_roles' | 'custom_methodology_criteria', index: number) => {
    setProfile(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }))
    setSaveSuccess(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!profile.company_name.trim()) {
      setError('Company name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/settings/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaveSuccess(true)
      router.refresh()

      // Clear success after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }, [profile, router])

  return (
    <div className="space-y-8">
      {/* Header Card */}
      <div className="rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, var(--scout-sky) 0%, var(--scout-trail) 100%)' }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <BuildingIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "'Bitter', Georgia, serif" }}>
              Company Profile
            </h2>
            <p className="text-white/80 mt-1 text-sm">
              Basic company identity and sales process configuration.
              Target market, value proposition, and competitive data are managed in Sales Intelligence below.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Basic Info Section */}
      <Section title="Company Identity" description="Basic information about your company">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Company Name"
            required
            value={profile.company_name}
            onChange={(v) => updateField('company_name', v)}
            placeholder="e.g., Acme Security"
          />
          <Field
            label="Industry"
            value={profile.industry || ''}
            onChange={(v) => updateField('industry', v)}
            placeholder="e.g., Product Security"
          />
        </div>
        <Field
          label="Website"
          value={profile.website || ''}
          onChange={(v) => updateField('website', v)}
          placeholder="e.g., acmesecurity.com"
        />
        <Field
          label="Tagline"
          value={profile.tagline || ''}
          onChange={(v) => updateField('tagline', v)}
          placeholder="e.g., Securing the products that power the world"
        />
      </Section>


      {/* Products & Services Section */}
      <Section title="Products & Services" description="What you sell">
        <TextArea
          label="Products/Services"
          value={profile.products_services || ''}
          onChange={(v) => updateField('products_services', v)}
          placeholder="Describe your main products and services..."
          rows={3}
        />
        <TextArea
          label="Common Use Cases"
          value={profile.use_cases || ''}
          onChange={(v) => updateField('use_cases', v)}
          placeholder="Describe typical use cases and deployment scenarios..."
          rows={3}
        />
      </Section>


      {/* Sales Context Section */}
      <Section title="Sales Context" description="Context about your typical sales process">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Typical Sales Cycle"
            value={profile.typical_sales_cycle || ''}
            onChange={(v) => updateField('typical_sales_cycle', v)}
            placeholder="e.g., 3-6 months"
          />
          <Field
            label="Average Deal Size"
            value={profile.average_deal_size || ''}
            onChange={(v) => updateField('average_deal_size', v)}
            placeholder="e.g., $50K-$200K"
          />
        </div>
        <TagInput
          label="Key Stakeholder Roles"
          tags={profile.key_stakeholder_roles || []}
          inputValue={roleInput}
          onInputChange={setRoleInput}
          onAdd={() => {
            addToArray('key_stakeholder_roles', roleInput)
            setRoleInput('')
          }}
          onRemove={(i) => removeFromArray('key_stakeholder_roles', i)}
          placeholder="e.g., CISO"
          suggestions={['CEO', 'CTO', 'CISO', 'VP Engineering', 'VP Product', 'Director of Security', 'IT Director', 'Procurement']}
        />
      </Section>

      {/* Sales Methodology Section */}
      <Section title="Sales Methodology" description="How you qualify and progress opportunities">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Qualification Methodology
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.keys(SALES_METHODOLOGIES) as SalesMethodologyType[]).map((key) => {
              const method = SALES_METHODOLOGIES[key]
              const isSelected = profile.sales_methodology === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField('sales_methodology', key)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {method.name}
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {method.fullName}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Show selected methodology details */}
        {profile.sales_methodology && profile.sales_methodology !== 'Custom' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <span className="font-medium">{SALES_METHODOLOGIES[profile.sales_methodology].name}</span>: {SALES_METHODOLOGIES[profile.sales_methodology].description}
            </p>
            <div className="flex flex-wrap gap-2">
              {SALES_METHODOLOGIES[profile.sales_methodology].criteria.map((criterion) => (
                <span
                  key={criterion}
                  className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                >
                  {criterion}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Custom methodology criteria */}
        {profile.sales_methodology === 'Custom' && (
          <TagInput
            label="Custom Qualification Criteria"
            tags={profile.custom_methodology_criteria || []}
            inputValue={customCriteriaInput}
            onInputChange={setCustomCriteriaInput}
            onAdd={() => {
              addToArray('custom_methodology_criteria', customCriteriaInput)
              setCustomCriteriaInput('')
            }}
            onRemove={(i) => removeFromArray('custom_methodology_criteria', i)}
            placeholder="e.g., Technical Fit"
            suggestions={['Budget', 'Authority', 'Need', 'Timeline', 'Champion', 'Competition', 'Technical Fit', 'Business Case']}
          />
        )}
      </Section>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
        {saveSuccess && (
          <div className="flex items-center gap-2" style={{ color: 'var(--scout-trail)' }}>
            <CheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Saved successfully</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: 'var(--scout-sky)' }}
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}

// Section component
function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  )
}

// Field component
function Field({
  label,
  value,
  onChange,
  placeholder,
  required
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}

// TextArea component
function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
    </div>
  )
}

// Select component
function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

// TagInput component
function TagInput({
  label,
  tags,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder,
  suggestions
}: {
  label: string
  tags: string[]
  inputValue: string
  onInputChange: (value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  placeholder?: string
  suggestions?: string[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>

      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          Add
        </button>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestions
            .filter(s => !tags.includes(s))
            .slice(0, 5)
            .map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  onInputChange(suggestion)
                  setTimeout(onAdd, 0)
                }}
                className="px-2 py-0.5 text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                + {suggestion}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
