-- ============================================
-- VECTOR IN FOUNDATION - Schema Updates
-- Adds tier, lifecycle, milestones, and whitespace tracking
-- ============================================

-- 1. Modify account_plans (Territory)
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS tier VARCHAR(20);
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50);
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS renewal_date DATE;
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS nps_score INTEGER;
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS csat_score INTEGER;

-- 2. Modify pursuits (Basecamp)
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS pursuit_type VARCHAR(20) DEFAULT 'new_business';
-- Values: 'new_business', 'renewal', 'upsell'

-- 3. Modify stakeholders (Compass)
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS power_level VARCHAR(20);
ALTER TABLE stakeholders ADD COLUMN IF NOT EXISTS interest_level VARCHAR(20);
-- Values for both: 'high', 'medium', 'low'

-- 4. Modify action_items
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS bucket_type VARCHAR(20);
-- Values: 'account', 'renewal', 'upsell', 'general'

-- 5. Create success_milestones table
CREATE TABLE IF NOT EXISTS success_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type VARCHAR(50),
  bucket_type VARCHAR(20),
  target_date DATE,
  achieved_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_success_milestones_account ON success_milestones(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_success_milestones_pursuit ON success_milestones(pursuit_id);

-- RLS for success_milestones
ALTER TABLE success_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on success_milestones" ON success_milestones
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Create division_product_usage table (White Space)
CREATE TABLE IF NOT EXISTS division_product_usage (
  usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans ON DELETE CASCADE,
  division_id UUID REFERENCES account_divisions ON DELETE CASCADE,
  product_module VARCHAR(100) NOT NULL,
  usage_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_plan_id, division_id, product_module)
);

CREATE INDEX IF NOT EXISTS idx_division_product_account ON division_product_usage(account_plan_id);

-- RLS for division_product_usage
ALTER TABLE division_product_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on division_product_usage" ON division_product_usage
  FOR ALL USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON COLUMN account_plans.tier IS 'Account tier: strategic, growth, maintain, etc.';
COMMENT ON COLUMN account_plans.lifecycle_stage IS 'Customer lifecycle: prospect, onboarding, active, at_risk, churned';
COMMENT ON COLUMN account_plans.renewal_date IS 'Next renewal date for customer accounts';
COMMENT ON COLUMN account_plans.nps_score IS 'Net Promoter Score (-100 to 100)';
COMMENT ON COLUMN account_plans.csat_score IS 'Customer Satisfaction Score (1-5 or 1-100)';
COMMENT ON COLUMN pursuits.pursuit_type IS 'Type: new_business, renewal, upsell';
COMMENT ON COLUMN stakeholders.power_level IS 'Power/influence level: high, medium, low';
COMMENT ON COLUMN stakeholders.interest_level IS 'Interest/engagement level: high, medium, low';
COMMENT ON COLUMN action_items.bucket_type IS 'Bucket: account, renewal, upsell, general';
COMMENT ON TABLE success_milestones IS 'Customer success milestones for tracking value delivery';
COMMENT ON TABLE division_product_usage IS 'White space tracking - product usage by division';
