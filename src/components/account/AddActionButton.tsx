'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  accountId: string
  pursuits: Array<{ pursuit_id: string; name: string }>
  risks?: Array<{ risk_id: string; description: string; status?: string }>
  defaultRiskId?: string
}

export function AddActionButton({ accountId, pursuits, risks = [], defaultRiskId }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    pursuit_id: '',
    risk_id: defaultRiskId || '',
  })

  const openRisks = risks.filter(r => r.status === 'open' || !r.status)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          due_date: formData.due_date,
          priority: formData.priority,
          pursuit_id: formData.pursuit_id || null,
          risk_id: formData.risk_id || null,
          status: 'Not Started',
        }),
      })

      if (response.ok) {
        setFormData({ title: '', due_date: new Date().toISOString().split('T')[0], priority: 'medium', pursuit_id: '', risk_id: '' })
        setIsOpen(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to add action:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium flex items-center gap-1"
        style={{ color: 'var(--scout-sky)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Action
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--scout-saddle)', fontFamily: "'Bitter', Georgia, serif" }}
        >
          Add Action Item
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
              What needs to be done?
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Send follow-up email to CFO"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: 'var(--scout-border)' }}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {pursuits.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Related Opportunity (optional)
              </label>
              <select
                value={formData.pursuit_id}
                onChange={(e) => setFormData({ ...formData, pursuit_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="">No specific opportunity</option>
                {pursuits.map(p => (
                  <option key={p.pursuit_id} value={p.pursuit_id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {openRisks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
                Related Risk (optional)
              </label>
              <select
                value={formData.risk_id}
                onChange={(e) => setFormData({ ...formData, risk_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: 'var(--scout-border)' }}
              >
                <option value="">No specific risk</option>
                {openRisks.map(r => (
                  <option key={r.risk_id} value={r.risk_id}>
                    {r.description.length > 60 ? r.description.substring(0, 60) + '...' : r.description}
                  </option>
                ))}
              </select>
              {formData.risk_id && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--scout-earth-light)' }}>
                  This action will be tracked with the risk and help close it out.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg"
              style={{ color: 'var(--scout-earth)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--scout-trail)' }}
            >
              {saving ? 'Adding...' : 'Add Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
