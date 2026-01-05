-- Account Structure & Divisions
-- Adds support for corporate structure, divisions, and products

-- 1. Create account_divisions table
CREATE TABLE IF NOT EXISTS account_divisions (
  division_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  division_type TEXT, -- 'division', 'business_unit', 'subsidiary', 'region'
  products TEXT[], -- Array of product names
  parent_division_id UUID REFERENCES account_divisions(division_id) ON DELETE SET NULL,
  headcount INTEGER,
  revenue_estimate TEXT,
  key_focus_areas TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_divisions_account ON account_divisions(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_account_divisions_parent ON account_divisions(parent_division_id);

-- 2. Add corporate_structure to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS corporate_structure JSONB DEFAULT '{}';
-- Structure: {
--   "headquarters": "City, Country",
--   "parent_company": "Parent Corp Name",
--   "ownership_type": "public" | "private" | "subsidiary",
--   "stock_symbol": "RHHBY",
--   "fiscal_year_end": "December",
--   "employee_count": 100000,
--   "annual_revenue": "$65B",
--   "founded_year": 1896,
--   "ceo": "Name",
--   "key_executives": [{"name": "", "title": "", "linkedin": ""}]
-- }

-- 3. Add enrichment metadata to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'not_started';
-- Values: 'not_started', 'in_progress', 'completed', 'needs_refresh'

ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
-- Values: 'scout_ai', 'manual', 'hubspot', 'salesforce'

-- 4. Add division_id to contacts/stakeholders for mapping
ALTER TABLE prospect_contacts ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES account_divisions(division_id) ON DELETE SET NULL;
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES account_divisions(division_id) ON DELETE SET NULL;

-- 5. Enable RLS on new table
ALTER TABLE account_divisions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single-tenant)
CREATE POLICY "Allow all operations on account_divisions" ON account_divisions
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_division_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_division_updated_at ON account_divisions;
CREATE TRIGGER trigger_update_division_updated_at
  BEFORE UPDATE ON account_divisions
  FOR EACH ROW
  EXECUTE FUNCTION update_division_updated_at();
