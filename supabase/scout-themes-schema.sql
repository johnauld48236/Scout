-- ============================================
-- SCOUT THEMES SCHEMA
-- Exploratory opportunity themes (not CRM deals)
-- ============================================

-- Scout Themes - hypotheses to investigate, not active deals
CREATE TABLE IF NOT EXISTS scout_themes (
  theme_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,

  -- Theme details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  why_it_matters TEXT,

  -- Sizing (NOT dollar values - High/Medium/Low only)
  size VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'

  -- Connected intelligence
  signals_connected UUID[], -- References to account_signals
  questions_to_explore TEXT[], -- Questions for rep to investigate

  -- Status tracking
  status VARCHAR(50) DEFAULT 'exploring', -- 'exploring', 'validated', 'converted', 'dismissed'
  converted_to_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,

  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scout_themes_account ON scout_themes(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_scout_themes_status ON scout_themes(status);
CREATE INDEX IF NOT EXISTS idx_scout_themes_size ON scout_themes(size);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_scout_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scout_themes_updated_at ON scout_themes;
CREATE TRIGGER trigger_scout_themes_updated_at
  BEFORE UPDATE ON scout_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_scout_themes_updated_at();

-- Comments
COMMENT ON TABLE scout_themes IS 'Exploratory opportunity themes - hypotheses to investigate, not active CRM deals';
COMMENT ON COLUMN scout_themes.size IS 'Opportunity sizing: high, medium, low - NO dollar values';
COMMENT ON COLUMN scout_themes.status IS 'exploring = actively investigating, validated = confirmed interest, converted = became CRM deal, dismissed = not pursuing';
COMMENT ON COLUMN scout_themes.questions_to_explore IS 'Questions the rep should investigate to validate this theme';
