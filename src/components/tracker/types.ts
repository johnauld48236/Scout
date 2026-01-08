// Unified types for both Vector Out and Vector In trackers

export interface SignalItem {
  id: string
  title: string
  description?: string
  priority: 'P1' | 'P2' | 'P3' | 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  due_date?: string
  created_at?: string
  bucket?: '30' | '60' | '90' | ''
  initiative_id?: string
  source?: string
  source_url?: string
  // Vector-specific fields
  severity?: string
  signal_type?: string  // For Vector In: risk, sentiment, pattern
  item_type: 'pain_point' | 'risk' | 'field_request' | 'hazard' | 'distress_signal' | 'action_item'
}

export interface Initiative {
  id: string
  name: string
  description?: string
  color: string
  due_date?: string
  status: 'active' | 'completed' | 'archived'
  items_count: number
  created_at?: string
}

export interface TimeWindow {
  key: string
  label: string
  bucket: '30' | '60' | '90' | ''
  daysRange: [number, number]
}

export const TIME_WINDOWS: TimeWindow[] = [
  { key: 'this_week', label: 'This Week', bucket: '30', daysRange: [0, 7] },
  { key: 'next_week', label: 'Next Week', bucket: '60', daysRange: [8, 14] },
  { key: 'this_month', label: 'This Month', bucket: '90', daysRange: [15, 30] },
  { key: 'backlog', label: 'Backlog', bucket: '', daysRange: [31, 999] },
]

export const PRIORITY_CONFIG = {
  P1: { icon: '🔴', color: 'var(--scout-clay)', label: 'Critical' },
  P2: { icon: '🟡', color: 'var(--scout-sunset)', label: 'High' },
  P3: { icon: '🟢', color: 'var(--scout-trail)', label: 'Normal' },
  Critical: { icon: '🔴', color: 'var(--scout-clay)', label: 'Critical' },
  High: { icon: '🟡', color: 'var(--scout-sunset)', label: 'High' },
  Medium: { icon: '🟢', color: 'var(--scout-trail)', label: 'Medium' },
  Low: { icon: '⚪', color: 'var(--scout-earth-light)', label: 'Low' },
}

export const INITIATIVE_COLORS = [
  { value: 'blue', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
  { value: 'green', bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e' },
  { value: 'purple', bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7' },
  { value: 'orange', bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316' },
  { value: 'red', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
]

export function getTimeWindowForDate(dueDate: string | undefined): string {
  if (!dueDate) return 'backlog'
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 7) return 'this_week'
  if (days <= 14) return 'next_week'
  if (days <= 30) return 'this_month'
  return 'backlog'
}

export function getDefaultDueDateForBucket(bucket: '30' | '60' | '90' | ''): Date {
  const date = new Date()
  switch (bucket) {
    case '30':
      date.setDate(date.getDate() + 7)
      break
    case '60':
      date.setDate(date.getDate() + 14)
      break
    case '90':
      date.setDate(date.getDate() + 30)
      break
    default:
      date.setDate(date.getDate() + 90)
  }
  return date
}

// Adapter functions to convert existing data types to SignalItem format

export function painPointToSignalItem(painPoint: {
  pain_point_id: string
  title?: string
  description?: string
  severity?: string
  status?: string
  target_date?: string
  created_at?: string
  initiative_id?: string
  bucket?: string
}): SignalItem {
  return {
    id: painPoint.pain_point_id,
    // DB has description only, no title column - use description as title
    title: painPoint.title || painPoint.description || 'Untitled',
    description: painPoint.description,
    priority: painPoint.severity === 'critical' ? 'P1' : painPoint.severity === 'significant' ? 'P2' : 'P3',
    // Map pain_point status (active/addressed) to tracker status (open/completed)
    status: painPoint.status === 'addressed' ? 'completed' : 'open',
    due_date: painPoint.target_date,  // Map target_date → due_date for tracker
    severity: painPoint.severity,
    item_type: 'pain_point',
    created_at: painPoint.created_at,
    initiative_id: painPoint.initiative_id,
    bucket: painPoint.bucket as SignalItem['bucket'],
  }
}

export function riskToSignalItem(risk: {
  risk_id: string
  title?: string
  description?: string
  severity?: string
  status?: string
  target_date?: string
  mitigation_plan?: string
  created_at?: string
  initiative_id?: string
  bucket?: string
}): SignalItem {
  return {
    id: risk.risk_id,
    // DB has description only, no title column - use description as title
    title: risk.title || risk.description || 'Untitled',
    description: risk.description || risk.mitigation_plan,
    priority: risk.severity === 'critical' ? 'P1' : risk.severity === 'high' ? 'P2' : 'P3',
    // Map risk status (open/mitigated/closed) to tracker status
    status: risk.status === 'mitigated' ? 'completed' : risk.status === 'closed' ? 'closed' : 'open',
    due_date: risk.target_date,  // Map target_date → due_date for tracker
    severity: risk.severity,
    item_type: 'risk',
    created_at: risk.created_at,
    initiative_id: risk.initiative_id,
    bucket: risk.bucket as SignalItem['bucket'],
  }
}

export function actionItemToSignalItem(actionItem: {
  action_id: string
  title: string
  description?: string
  priority?: string
  status?: string
  due_date?: string
  bucket?: string
  initiative_id?: string
  created_at?: string
}): SignalItem {
  return {
    id: actionItem.action_id,
    title: actionItem.title,
    description: actionItem.description,
    priority: (actionItem.priority as SignalItem['priority']) || 'P2',
    status: (actionItem.status as SignalItem['status']) || 'open',
    due_date: actionItem.due_date,
    bucket: actionItem.bucket as SignalItem['bucket'],
    initiative_id: actionItem.initiative_id,
    item_type: 'action_item',
    created_at: actionItem.created_at,
  }
}

export function fieldRequestToSignalItem(request: {
  id: string
  title: string
  description?: string
  priority?: string
  status?: string
  due_date?: string
  target_date?: string
  created_at?: string
  initiative_id?: string
  bucket?: string
}): SignalItem {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    priority: (request.priority as SignalItem['priority']) || 'P2',
    status: (request.status as SignalItem['status']) || 'open',
    due_date: request.due_date || request.target_date,
    item_type: 'field_request',
    created_at: request.created_at,
    initiative_id: request.initiative_id,
    bucket: request.bucket as SignalItem['bucket'],
  }
}

export function hazardToSignalItem(hazard: {
  id: string
  title: string
  description?: string
  severity?: string
  status?: string
  due_date?: string
  target_date?: string
  created_at?: string
  initiative_id?: string
  bucket?: string
}): SignalItem {
  return {
    id: hazard.id,
    title: hazard.title,
    description: hazard.description,
    priority: hazard.severity === 'critical' ? 'P1' : hazard.severity === 'high' ? 'P2' : 'P3',
    status: (hazard.status as SignalItem['status']) || 'open',
    due_date: hazard.due_date || hazard.target_date,
    severity: hazard.severity,
    item_type: 'hazard',
    created_at: hazard.created_at,
    initiative_id: hazard.initiative_id,
    bucket: hazard.bucket as SignalItem['bucket'],
  }
}

export function distressSignalToSignalItem(signal: {
  signal_id: string
  title: string
  type?: string
  severity?: string
  source_url?: string
}): SignalItem {
  return {
    id: signal.signal_id,
    title: signal.title,
    priority: signal.severity === 'high' ? 'P1' : 'P2',
    status: 'open',
    severity: signal.severity,
    signal_type: signal.type,
    source_url: signal.source_url,
    item_type: 'distress_signal',
  }
}

export function bucketToInitiative(bucket: {
  bucket_id: string
  name: string
  description?: string
  color?: string
  target_date?: string
  status?: string
  items_count?: number
}): Initiative {
  return {
    id: bucket.bucket_id,
    name: bucket.name,
    description: bucket.description,
    color: bucket.color || 'blue',
    due_date: bucket.target_date,
    status: (bucket.status as Initiative['status']) || 'active',
    items_count: bucket.items_count || 0,
  }
}
