'use client'

import { useState, useEffect } from 'react'

interface HubSpotConfig {
  access_token: string
  portal_id?: string
  enabled: boolean
  last_synced?: string
}

export function HubSpotConfigSection() {
  const [config, setConfig] = useState<HubSpotConfig | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; portalId?: string } | null>(null)
  const [newToken, setNewToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Load current config
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/integrations/hubspot/config')
      const data = await res.json()
      if (data.success) {
        setConfig(data.config)
        setHasToken(data.hasToken)
      }
    } catch (err) {
      console.error('Failed to load HubSpot config:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!newToken && !hasToken) {
      setError('Please enter an access token')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/integrations/hubspot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: newToken || undefined,
          enabled: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setNewToken('')
        await loadConfig()
        setTestResult(null)
      } else {
        setError(data.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const res = await fetch('/api/integrations/hubspot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: newToken || undefined,
        }),
      })

      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success ? 'Connection successful!' : data.error,
        portalId: data.portalId,
      })

      if (data.success) {
        await loadConfig()
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect HubSpot?')) return

    setIsSaving(true)
    try {
      await fetch('/api/integrations/hubspot/config', { method: 'DELETE' })
      setConfig(null)
      setHasToken(false)
      setTestResult(null)
      setNewToken('')
    } catch (err) {
      setError('Failed to disconnect')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleEnabled = async () => {
    if (!config) return

    setIsSaving(true)
    try {
      const res = await fetch('/api/integrations/hubspot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !config.enabled,
        }),
      })

      if (res.ok) {
        await loadConfig()
      }
    } catch (err) {
      setError('Failed to update')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-200"></div>
          <div className="h-4 w-32 bg-zinc-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-lg border" style={{ backgroundColor: 'var(--scout-white)', borderColor: 'var(--scout-border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff7a59' }}>
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.41 10.24l-3.83 2.24 3.83 2.24V10.24zm-7.75 4.6l3.83-2.24-3.83-2.24v4.48zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--scout-earth)' }}>HubSpot</h3>
            <p className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              Connect to query contacts, companies, and deals
            </p>
          </div>
        </div>

        {hasToken && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleEnabled}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config?.enabled ? 'bg-green-500' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm" style={{ color: 'var(--scout-earth-light)' }}>
              {config?.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )}
      </div>

      {/* Connection Status */}
      {hasToken && config?.portal_id && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(93, 122, 93, 0.1)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--scout-trail)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Connected to Portal ID: {config.portal_id}</span>
          </div>
          {config.last_synced && (
            <p className="text-xs mt-1" style={{ color: 'var(--scout-earth-light)' }}>
              Last synced: {new Date(config.last_synced).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Token Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--scout-earth)' }}>
            Private App Access Token
          </label>
          <input
            type="password"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            placeholder={hasToken ? '••••••••••••••••' : 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--scout-border)',
              backgroundColor: 'var(--scout-white)',
              color: 'var(--scout-earth)',
            }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--scout-earth-light)' }}>
            Create a Private App in HubSpot Settings → Integrations → Private Apps
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(169, 68, 66, 0.1)', color: 'var(--scout-clay)' }}>
            {error}
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: testResult.success ? 'rgba(93, 122, 93, 0.1)' : 'rgba(169, 68, 66, 0.1)',
              color: testResult.success ? 'var(--scout-trail)' : 'var(--scout-clay)',
            }}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.portalId && (
              <p className="mt-1 text-xs">Portal ID: {testResult.portalId}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || (!newToken && !hasToken)}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--scout-border)',
              color: 'var(--scout-earth)',
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!newToken && !hasToken)}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--scout-saddle)' }}
          >
            {isSaving ? 'Saving...' : hasToken ? 'Update Token' : 'Connect'}
          </button>

          {hasToken && (
            <button
              onClick={handleDisconnect}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ color: 'var(--scout-clay)' }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Help Link */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--scout-border)' }}>
        <a
          href="https://developers.hubspot.com/docs/api/private-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm flex items-center gap-1"
          style={{ color: 'var(--scout-sky)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          How to create a HubSpot Private App
        </a>
      </div>
    </div>
  )
}
