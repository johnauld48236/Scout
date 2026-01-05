-- Weekly Review & Favorites Schema
-- Adds favorites tagging and weekly review cycle tracking

-- ============================================
-- FAVORITES
-- ============================================

-- Add is_favorite to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add is_favorite to pursuits
ALTER TABLE pursuits ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- ============================================
-- WEEKLY REVIEW
-- ============================================

-- Add weekly review fields to account_plans
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS in_weekly_review BOOLEAN DEFAULT FALSE;
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS review_cadence VARCHAR(20) DEFAULT 'weekly';
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;
ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS last_reviewed_by VARCHAR(255);

-- ============================================
-- REVIEW NOTES
-- ============================================

CREATE TABLE IF NOT EXISTS review_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- general, action_needed, follow_up, win, concern, cleanup
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  review_week DATE, -- Monday of the review week for grouping
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP
);

-- Index for efficient querying by account and week
CREATE INDEX IF NOT EXISTS idx_review_notes_account ON review_notes(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_review_notes_week ON review_notes(review_week);
CREATE INDEX IF NOT EXISTS idx_review_notes_unresolved ON review_notes(account_plan_id) WHERE is_resolved = FALSE;

-- ============================================
-- WEEKLY SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  snapshot_week DATE NOT NULL, -- Monday of week
  pipeline_value NUMERIC DEFAULT 0,
  opportunity_count INTEGER DEFAULT 0,
  stakeholder_count INTEGER DEFAULT 0,
  open_risk_count INTEGER DEFAULT 0,
  overdue_action_count INTEGER DEFAULT 0,
  engagement_count_week INTEGER DEFAULT 0, -- engagements that week
  bant_summary JSONB DEFAULT '{}', -- {pursuit_id: {B: 25, A: 15, N: 25, T: 0}, ...}
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_plan_id, snapshot_week)
);

-- Index for efficient week-over-week comparisons
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_account_week ON weekly_snapshots(account_plan_id, snapshot_week DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust for your auth model)
CREATE POLICY "Allow all for review_notes" ON review_notes FOR ALL USING (true);
CREATE POLICY "Allow all for weekly_snapshots" ON weekly_snapshots FOR ALL USING (true);

-- ============================================
-- HELPER FUNCTION: Get Monday of a given week
-- ============================================

CREATE OR REPLACE FUNCTION get_week_monday(d DATE)
RETURNS DATE AS $$
BEGIN
  RETURN d - EXTRACT(DOW FROM d)::INTEGER + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
