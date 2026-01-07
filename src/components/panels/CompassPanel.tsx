'use client'

import { useState } from 'react'

interface Stakeholder {
  stakeholder_id: string
  name: string
  title: string
  email?: string
  phone?: string
  influence_level: string
  is_placeholder?: boolean  // true = waypoint (role to find), false = confirmed contact
  placeholder_role?: string  // Role description for waypoints
}

interface CompassPanelProps {
  accountPlanId: string
  stakeholders: Stakeholder[]
  onUpdate?: () => void
  useScoutTerminology?: boolean
}

export function CompassPanel({
  accountPlanId,
  stakeholders,
  onUpdate,
  useScoutTerminology = false,
}: CompassPanelProps) {
  const [isAdding, setIsAdding] = useState<'confirmed' | 'waypoint' | null>(null)
  const [newContact, setNewContact] = useState({ name: '', title: '', email: '', influence_level: 'medium' })
  const [saving, setSaving] = useState(false)

  const labels = useScoutTerminology
    ? { section: 'Compass', confirmed: 'Confirmed', waypoint: 'Waypoints', addConfirmed: 'Add to Compass', addWaypoint: 'Add Waypoint' }
    : { section: 'Stakeholders', confirmed: 'Known Contacts', waypoint: 'Roles to Find', addConfirmed: 'Add Contact', addWaypoint: 'Add Role' }

  // Separate confirmed (is_placeholder=false) vs waypoints (is_placeholder=true)
  const confirmed = stakeholders.filter(s => !s.is_placeholder)
  const waypoints = stakeholders.filter(s => s.is_placeholder)

  const handleAddContact = async () => {
    if (!newContact.name.trim() && !newContact.title.trim()) return
    setSaving(true)
    try {
      const isWaypoint = isAdding === 'waypoint'
      const response = await fetch(`/api/accounts/${accountPlanId}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: isWaypoint ? `${newContact.title} - TBD` : newContact.name.trim(),
          title: newContact.title.trim(),
          email: newContact.email.trim() || null,
          influence_level: newContact.influence_level,
          is_placeholder: isWaypoint,
          placeholder_role: isWaypoint ? newContact.title.trim() : null,
        }),
      })
      if (response.ok) {
        setNewContact({ name: '', title: '', email: '', influence_level: 'medium' })
        setIsAdding(null)
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to add contact:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContact = async (stakeholderId: string) => {
    if (!confirm('Remove this contact?')) return
    try {
      await fetch(`/api/stakeholders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: stakeholderId }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }

  const handleConvertToConfirmed = async (stakeholder: Stakeholder) => {
    const name = prompt('Enter the person\'s name:', '')
    if (!name) return
    try {
      await fetch(`/api/stakeholders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholder_id: stakeholder.stakeholder_id,
          full_name: name.trim(),
          is_placeholder: false,
        }),
      })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to convert contact:', error)
    }
  }

  const getInfluenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'var(--scout-trail)'
      case 'medium': return 'var(--scout-sky)'
      default: return 'var(--scout-earth-light)'
    }
  }

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm" style={{ color: 'var(--scout-earth)' }}>
        {useScoutTerminology
          ? 'Build your compass - the people who point you toward success. Track both confirmed contacts and waypoints (roles you need to find).'
          : 'Map the key stakeholders and identify roles you need to find.'}
      </p>

      {/* Confirmed Contacts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
            {labels.confirmed} ({confirmed.length})
          </h3>
          <button
            onClick={() => setIsAdding('confirmed')}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
          >
            + {labels.addConfirmed}
          </button>
        </div>

        {/* Add Confirmed Form */}
        {isAdding === 'confirmed' && (
          <AddContactForm
            type="confirmed"
            contact={newContact}
            setContact={setNewContact}
            onSave={handleAddContact}
            onCancel={() => { setIsAdding(null); setNewContact({ name: '', title: '', email: '', influence_level: 'medium' }) }}
            saving={saving}
          />
        )}

        {confirmed.length === 0 && isAdding !== 'confirmed' ? (
          <EmptyState
            message="No confirmed contacts yet"
            action={labels.addConfirmed}
            onAction={() => setIsAdding('confirmed')}
          />
        ) : (
          <div className="space-y-2">
            {confirmed.map((contact) => (
              <ContactCard
                key={contact.stakeholder_id}
                contact={contact}
                getInfluenceColor={getInfluenceColor}
                onDelete={() => handleDeleteContact(contact.stakeholder_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Waypoints */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
            {labels.waypoint} ({waypoints.length})
          </h3>
          <button
            onClick={() => setIsAdding('waypoint')}
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sunset)' }}
          >
            + {labels.addWaypoint}
          </button>
        </div>

        {/* Add Waypoint Form */}
        {isAdding === 'waypoint' && (
          <AddContactForm
            type="waypoint"
            contact={newContact}
            setContact={setNewContact}
            onSave={handleAddContact}
            onCancel={() => { setIsAdding(null); setNewContact({ name: '', title: '', email: '', influence_level: 'medium' }) }}
            saving={saving}
          />
        )}

        {waypoints.length === 0 && isAdding !== 'waypoint' ? (
          <EmptyState
            message={useScoutTerminology ? "No waypoints set" : "No roles identified"}
            action={labels.addWaypoint}
            onAction={() => setIsAdding('waypoint')}
          />
        ) : (
          <div className="space-y-2">
            {waypoints.map((contact) => (
              <WaypointCard
                key={contact.stakeholder_id}
                contact={contact}
                onConvert={() => handleConvertToConfirmed(contact)}
                onDelete={() => handleDeleteContact(contact.stakeholder_id)}
                useScoutTerminology={useScoutTerminology}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Discover */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: 'rgba(56, 152, 199, 0.05)', borderColor: 'var(--scout-sky)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--scout-saddle)' }}>
              {useScoutTerminology ? 'Discover Waypoints' : 'Find More People'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Let AI research and suggest key roles and people at this company.
            </p>
            <button
              className="mt-2 text-sm px-3 py-1.5 rounded border hover:bg-white/50"
              style={{ borderColor: 'var(--scout-sky)', color: 'var(--scout-sky)' }}
            >
              Discover People
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddContactForm({
  type,
  contact,
  setContact,
  onSave,
  onCancel,
  saving,
}: {
  type: 'confirmed' | 'waypoint'
  contact: { name: string; title: string; email: string; influence_level: string }
  setContact: (c: { name: string; title: string; email: string; influence_level: string }) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  return (
    <div
      className="p-3 rounded-lg border mb-3"
      style={{ backgroundColor: 'var(--scout-parchment)', borderColor: 'var(--scout-border)' }}
    >
      <div className="space-y-2">
        {type === 'confirmed' && (
          <input
            type="text"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            placeholder="Full name..."
            className="w-full px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--scout-border)' }}
            autoFocus
          />
        )}
        <input
          type="text"
          value={contact.title}
          onChange={(e) => setContact({ ...contact, title: e.target.value })}
          placeholder={type === 'waypoint' ? "Role title (e.g., CISO, VP Engineering)..." : "Title..."}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--scout-border)' }}
          autoFocus={type === 'waypoint'}
        />
        {type === 'confirmed' && (
          <input
            type="email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            placeholder="Email (optional)..."
            className="w-full px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--scout-border)' }}
          />
        )}
        <select
          value={contact.influence_level}
          onChange={(e) => setContact({ ...contact, influence_level: e.target.value })}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          <option value="high">High Influence</option>
          <option value="medium">Medium Influence</option>
          <option value="low">Low Influence</option>
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onSave}
          disabled={saving || (type === 'confirmed' ? !contact.name.trim() : !contact.title.trim())}
          className="px-3 py-1 text-sm rounded text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--scout-trail)' }}
        >
          {saving ? 'Saving...' : 'Add'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm rounded border"
          style={{ borderColor: 'var(--scout-border)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ContactCard({
  contact,
  getInfluenceColor,
  onDelete,
}: {
  contact: Stakeholder
  getInfluenceColor: (level: string) => string
  onDelete: () => void
}) {
  return (
    <div
      className="p-3 rounded-lg border flex items-center justify-between group"
      style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
          style={{ backgroundColor: getInfluenceColor(contact.influence_level) }}
        >
          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
            {contact.name}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            {contact.title}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded capitalize"
          style={{ backgroundColor: `${getInfluenceColor(contact.influence_level)}20`, color: getInfluenceColor(contact.influence_level) }}
        >
          {contact.influence_level}
        </span>
        <button
          onClick={onDelete}
          className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          style={{ color: 'var(--scout-clay)' }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function WaypointCard({
  contact,
  onConvert,
  onDelete,
  useScoutTerminology,
}: {
  contact: Stakeholder
  onConvert: () => void
  onDelete: () => void
  useScoutTerminology: boolean
}) {
  // Use placeholder_role if available, otherwise fall back to title or name
  const displayTitle = contact.placeholder_role || contact.title || contact.name.replace(' - TBD', '')
  return (
    <div
      className="p-3 rounded-lg border flex items-center justify-between group"
      style={{ backgroundColor: 'rgba(210, 105, 30, 0.03)', borderColor: 'var(--scout-sunset)', borderStyle: 'dashed' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ backgroundColor: 'var(--scout-parchment)', color: 'var(--scout-earth-light)' }}
        >
          ?
        </div>
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--scout-saddle)' }}>
            {displayTitle}
          </p>
          <p className="text-xs" style={{ color: 'var(--scout-sunset)' }}>
            {useScoutTerminology ? 'Waypoint - need to find' : 'Role to identify'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onConvert}
          className="text-xs px-2 py-1 rounded border hover:bg-white"
          style={{ borderColor: 'var(--scout-trail)', color: 'var(--scout-trail)' }}
        >
          → Found them
        </button>
        <button
          onClick={onDelete}
          className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          style={{ color: 'var(--scout-clay)' }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function EmptyState({
  message,
  action,
  onAction,
}: {
  message: string
  action: string
  onAction: () => void
}) {
  return (
    <div
      className="p-6 rounded-lg border text-center"
      style={{ borderColor: 'var(--scout-border)', borderStyle: 'dashed' }}
    >
      <p className="text-sm mb-2" style={{ color: 'var(--scout-earth-light)' }}>
        {message}
      </p>
      <button
        onClick={onAction}
        className="text-sm px-4 py-2 rounded border hover:bg-gray-50"
        style={{ borderColor: 'var(--scout-border)', color: 'var(--scout-sky)' }}
      >
        + {action}
      </button>
    </div>
  )
}
