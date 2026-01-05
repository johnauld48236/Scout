-- ============================================
-- ACCOUNT PLAN WIZARD SCHEMA UPDATES
-- Adds fields needed for the AI-assisted wizard
-- ============================================

-- Add new columns to account_plans table
ALTER TABLE account_plans
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS headquarters TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS account_strategy TEXT,
  ADD COLUMN IF NOT EXISTS strategic_objectives TEXT,
  ADD COLUMN IF NOT EXISTS risk_factors TEXT,
  ADD COLUMN IF NOT EXISTS research_summary TEXT,
  ADD COLUMN IF NOT EXISTS research_findings JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;

-- Add category column to action_items if not exists
ALTER TABLE action_items
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other';

-- Ensure stakeholders has all needed columns
ALTER TABLE stakeholders
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Grant permissions (same as company_profile)
GRANT ALL ON account_plans TO anon;
GRANT ALL ON account_plans TO authenticated;
GRANT ALL ON account_plans TO service_role;

GRANT ALL ON stakeholders TO anon;
GRANT ALL ON stakeholders TO authenticated;
GRANT ALL ON stakeholders TO service_role;

GRANT ALL ON pursuits TO anon;
GRANT ALL ON pursuits TO authenticated;
GRANT ALL ON pursuits TO service_role;

GRANT ALL ON action_items TO anon;
GRANT ALL ON action_items TO authenticated;
GRANT ALL ON action_items TO service_role;
