-- Pipeline Placeholders Schema
-- Represents projected/placeholder deals in the pipeline that need to be filled
-- When creating a real opportunity, it can be linked to fill a placeholder

CREATE TABLE IF NOT EXISTS pipeline_placeholders (
  placeholder_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Placeholder definition
  name VARCHAR(255) NOT NULL,                 -- e.g., "Medical Device PoC Q1"
  placeholder_type VARCHAR(50) NOT NULL,      -- 'poc', 'commercial', 'renewal'
  vertical VARCHAR(100),                       -- Medical, Automotive, etc.
  campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL,

  -- Target quarter/period
  target_quarter VARCHAR(10),                  -- 'Q1', 'Q2', 'Q3', 'Q4'
  target_year INTEGER DEFAULT 2026,

  -- Projected values
  projected_value DECIMAL(15,2),               -- Expected deal size
  probability INTEGER DEFAULT 50,              -- Probability percentage

  -- Link to goal (for rollup tracking)
  goal_id UUID REFERENCES goals(goal_id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'open',           -- 'open', 'filled', 'cancelled'
  filled_by_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  filled_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placeholders_status ON pipeline_placeholders(status);
CREATE INDEX IF NOT EXISTS idx_placeholders_vertical ON pipeline_placeholders(vertical);
CREATE INDEX IF NOT EXISTS idx_placeholders_quarter ON pipeline_placeholders(target_year, target_quarter);

-- Add pipeline_placeholder_id to pursuits for linking
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS pipeline_placeholder_id UUID REFERENCES pipeline_placeholders(placeholder_id) ON DELETE SET NULL;

-- Add stakeholder association to pursuits (many-to-many)
CREATE TABLE IF NOT EXISTS pursuit_stakeholders (
  pursuit_id UUID NOT NULL REFERENCES pursuits(pursuit_id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(stakeholder_id) ON DELETE CASCADE,
  role VARCHAR(50),  -- 'champion', 'economic_buyer', 'technical_buyer', 'influencer', 'blocker'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (pursuit_id, stakeholder_id)
);

CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_pursuit ON pursuit_stakeholders(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_pursuit_stakeholders_stakeholder ON pursuit_stakeholders(stakeholder_id);

-- Enable RLS
ALTER TABLE pipeline_placeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pursuit_stakeholders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to pipeline_placeholders" ON pipeline_placeholders FOR ALL USING (true);
CREATE POLICY "Allow all access to pursuit_stakeholders" ON pursuit_stakeholders FOR ALL USING (true);

-- Seed some sample placeholders
INSERT INTO pipeline_placeholders (name, placeholder_type, vertical, target_quarter, target_year, projected_value, probability, notes)
VALUES
  ('Medical Device PoC - Q1', 'poc', 'Medical', 'Q1', 2026, 75000, 60, 'Initial POC engagement from H-ISAC outreach'),
  ('Medical Commercial Deal - Q2', 'commercial', 'Medical', 'Q2', 2026, 350000, 40, 'Expected conversion from Q1 POC'),
  ('CRA Compliance PoC - Q1', 'poc', 'Automotive', 'Q1', 2026, 50000, 70, 'CRA regulation driving urgent POC needs'),
  ('CRA Commercial Deal - Q2', 'commercial', 'Automotive', 'Q2', 2026, 400000, 35, 'Post-POC commercial expansion'),
  ('Medical Device PoC - Q2', 'poc', 'Medical', 'Q2', 2026, 75000, 50, 'Second wave H-ISAC pipeline'),
  ('Industrial OT PoC - Q2', 'poc', 'Industrial', 'Q2', 2026, 60000, 45, 'Industrial OT security opportunity');
