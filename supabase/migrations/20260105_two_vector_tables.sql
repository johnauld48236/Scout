-- Two-Vector Architecture Tables
-- Run this migration to support the new Vector Out / Vector In architecture

-- ============================================================================
-- SPARKS TABLE (Vector Out - Exploratory Themes)
-- These are exploratory opportunity themes that may become CRM deals
-- Note: We also have scout_themes table which serves similar purpose
-- UI will call these "Sparks" but scout_themes table remains for existing data
-- ============================================================================
CREATE TABLE IF NOT EXISTS sparks (
  spark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  size VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  signals_connected UUID[], -- References to account_signals
  questions_to_explore TEXT[],
  status VARCHAR(50) DEFAULT 'exploring', -- 'exploring', 'validated', 'converted', 'archived'
  converted_to_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for account lookups
CREATE INDEX IF NOT EXISTS idx_sparks_account_plan_id ON sparks(account_plan_id);

-- ============================================================================
-- PATTERNS TABLE (Vector In - Recurring Issues)
-- AI-identified recurring problems from ticket/issue data
-- ============================================================================
CREATE TABLE IF NOT EXISTS patterns (
  pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pattern_type VARCHAR(50), -- 'recurring', 'escalating', 'spreading', 'sentiment'
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  related_issues UUID[], -- References to account_issues
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'addressed', 'monitoring', 'resolved'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for account lookups
CREATE INDEX IF NOT EXISTS idx_patterns_account_plan_id ON patterns(account_plan_id);

-- ============================================================================
-- ACCOUNT ISSUES TABLE (Vector In - Imported Issues)
-- Issues imported from Jira, Asana, Monday, Zendesk, or manual entry
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_issues (
  issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  external_id VARCHAR(255), -- Jira ticket ID, Asana task ID, etc.
  source VARCHAR(50), -- 'jira', 'asana', 'monday', 'zendesk', 'manual'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(100), -- Open, In Progress, Resolved, etc (varies by source)
  priority VARCHAR(50), -- P1, P2, P3, etc or High/Medium/Low
  assignee VARCHAR(255),
  reporter VARCHAR(255),
  created_date DATE,
  resolved_date DATE,
  stakeholder_id UUID REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
  pattern_id UUID REFERENCES patterns(pattern_id) ON DELETE SET NULL,
  raw_data JSONB, -- Original data from source system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for account and pattern lookups
CREATE INDEX IF NOT EXISTS idx_account_issues_account_plan_id ON account_issues(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_account_issues_pattern_id ON account_issues(pattern_id);
CREATE INDEX IF NOT EXISTS idx_account_issues_external_id ON account_issues(external_id);

-- ============================================================================
-- ALTER EXISTING TABLES - Add vector context
-- ============================================================================

-- Add vector column to action_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'action_items' AND column_name = 'vector') THEN
    ALTER TABLE action_items ADD COLUMN vector VARCHAR(10) DEFAULT 'out';
    COMMENT ON COLUMN action_items.vector IS 'Which vector this action belongs to: out (sales), in (account management)';
  END IF;
END $$;

-- Add vector column to pain_points if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'pain_points' AND column_name = 'vector') THEN
    ALTER TABLE pain_points ADD COLUMN vector VARCHAR(10) DEFAULT 'out';
    COMMENT ON COLUMN pain_points.vector IS 'Which vector this pain point belongs to: out (sales opportunity), in (customer issue)';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE sparks IS 'Vector Out: Exploratory opportunity themes that may become deals. UI calls these "Sparks".';
COMMENT ON TABLE patterns IS 'Vector In: AI-identified recurring problems from issue analysis.';
COMMENT ON TABLE account_issues IS 'Vector In: Issues imported from external systems (Jira, Asana, Monday, etc).';
