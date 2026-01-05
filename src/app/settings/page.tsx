import { CompanyProfileForm } from '@/components/settings/CompanyProfileForm'
import { SalesIntelligenceEditor } from '@/components/settings/SalesIntelligenceEditor'
import { DataImportSection } from '@/components/settings/DataImportSection'
import { HubSpotConfigSection } from '@/components/integrations/HubSpotConfigSection'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Try to load existing profile
  const { data: profile } = await supabase
    .from('company_profile')
    .select('*')
    .limit(1)
    .single()

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Configure your company profile and sales intelligence to personalize AI assistance
        </p>
      </div>

      {/* Tab-like sections */}
      <div className="space-y-8">
        {/* Company Profile Section */}
        <div>
          <h2
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          >
            Company Profile
          </h2>
          <CompanyProfileForm initialProfile={profile} />
        </div>

        {/* Sales Intelligence Section */}
        <div>
          <h2
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          >
            Sales Intelligence
          </h2>
          <SalesIntelligenceEditor initialData={profile?.sales_intelligence || null} />
        </div>

        {/* Data Import Section */}
        <div>
          <h2
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          >
            Data Import
          </h2>
          <DataImportSection />
        </div>

        {/* Integrations Section */}
        <div>
          <h2
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          >
            Integrations
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Connect external CRM systems to query and enrich your data
          </p>
          <HubSpotConfigSection />
        </div>
      </div>
    </div>
  )
}
