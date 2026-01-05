'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccountOwnerEditorProps {
  accountId: string
  salesRep: string | null
  technicalAm: string | null
}

export function AccountOwnerEditor({ accountId, salesRep, technicalAm }: AccountOwnerEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    sales_rep: salesRep || '',
    technical_am: technicalAm || '',
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsEditing(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update owners:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasOwners = salesRep || technicalAm

  if (isEditing) {
    return (
      <div
        className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border"
        style={{ borderColor: 'var(--scout-border)', backgroundColor: 'var(--scout-white)' }}
      >
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>Sales:</span>
          <input
            type="text"
            value={formData.sales_rep}
            onChange={(e) => setFormData({ ...formData, sales_rep: e.target.value })}
            placeholder="Sales Rep"
            className="text-sm px-2 py-0.5 border rounded w-28"
            style={{ borderColor: 'var(--scout-border)' }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>TAM:</span>
          <input
            type="text"
            value={formData.technical_am}
            onChange={(e) => setFormData({ ...formData, technical_am: e.target.value })}
            placeholder="Technical AM"
            className="text-sm px-2 py-0.5 border rounded w-28"
            style={{ borderColor: 'var(--scout-border)' }}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="text-xs px-2 py-1 rounded text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--scout-trail)' }}
        >
          {isSaving ? '...' : 'Save'}
        </button>
        <button
          onClick={() => {
            setIsEditing(false)
            setFormData({ sales_rep: salesRep || '', technical_am: technicalAm || '' })
          }}
          className="text-xs px-2 py-1"
          style={{ color: 'var(--scout-earth-light)' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="inline-flex items-center gap-2 text-sm hover:bg-gray-50 px-2 py-1 rounded transition-colors group"
      style={{ color: 'var(--scout-earth-light)' }}
    >
      {hasOwners ? (
        <>
          {salesRep && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span style={{ color: 'var(--scout-earth)' }}>{salesRep}</span>
            </span>
          )}
          {salesRep && technicalAm && <span>·</span>}
          {technicalAm && (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style={{ color: 'var(--scout-earth)' }}>{technicalAm}</span>
            </span>
          )}
          <svg
            className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span className="text-xs">Assign owners</span>
        </>
      )}
    </button>
  )
}
