-- ============================================
-- WIZARD V2 SCHEMA UPDATES
-- Adds risks table and BANT tracking to actions
-- ============================================

-- 1. Create risks table
CREATE TABLE IF NOT EXISTS risks (
  risk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,

  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'mitigated', 'closed', 'realized'
  mitigation TEXT,
  impact_on_bant VARCHAR(1), -- 'B', 'A', 'N', 'T', or null for general

  identified_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for risks
CREATE INDEX IF NOT EXISTS idx_risks_account ON risks(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_risks_pursuit ON risks(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);

-- RLS for risks
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON risks;
CREATE POLICY "Allow all for authenticated users" ON risks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON risks;
CREATE POLICY "Allow all for anon" ON risks
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Add BANT tracking columns to action_items
ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS bant_dimension VARCHAR(1), -- 'B', 'A', 'N', 'T'
ADD COLUMN IF NOT EXISTS milestone_period VARCHAR(10); -- 'day_30', 'day_60', 'day_90'

-- 3. Create pursuit_stakeholders junction table (if not exists)
CREATE TABLE IF NOT EXISTS pursuit_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role_in_deal VARCHAR(100), -- 'Champion', 'Decision Maker', 'Influencer', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pursuit_id, stakeholder_id)
);

-- Indexes for pursuit_stakeholders
CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_pursuit ON pursuit_stakeholders(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_stakeholder ON pursuit_stakeholders(stakeholder_id);

-- RLS for pursuit_stakeholders
ALTER TABLE pursuit_stakeholders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON pursuit_stakeholders;
CREATE POLICY "Allow all for authenticated users" ON pursuit_stakeholders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon" ON pursuit_stakeholders;
CREATE POLICY "Allow all for anon" ON pursuit_stakeholders
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Add business_unit to stakeholders if not exists
ALTER TABLE stakeholders
ADD COLUMN IF NOT EXISTS business_unit VARCHAR(100);

-- Comments
COMMENT ON TABLE risks IS 'Tracks risks that could impact deal or account health';
COMMENT ON COLUMN risks.impact_on_bant IS 'Which BANT dimension this risk affects: B, A, N, T, or null for general';
COMMENT ON COLUMN action_items.bant_dimension IS 'Which BANT gap this action addresses: B, A, N, T';
COMMENT ON COLUMN action_items.milestone_period IS 'Which milestone period: day_30, day_60, day_90';
