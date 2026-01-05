-- ============================================
-- REVIEW QUEUE SCHEMA
-- Adds needs_review flag to risks/pain_points
-- so AI imports go to triage queue first
-- ============================================

-- Add needs_review flag to risks
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS import_source VARCHAR(50), -- 'meeting_notes', 'weekly_review', 'manual'
ADD COLUMN IF NOT EXISTS import_batch_id UUID; -- Groups items from same import

-- Add needs_review flag to pain_points
ALTER TABLE pain_points
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS import_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Add needs_review flag to action_items
ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS import_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Indexes for filtering review queue items
CREATE INDEX IF NOT EXISTS idx_risks_needs_review ON risks(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_pain_points_needs_review ON pain_points(needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_action_items_needs_review ON action_items(needs_review) WHERE needs_review = true;

-- Import batches table - tracks each import session
CREATE TABLE IF NOT EXISTS import_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL, -- 'meeting_notes', 'weekly_review', 'call_transcript'
  source_title TEXT, -- 'Q4 Planning Meeting', 'Weekly Review 1/2'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'reviewed', 'dismissed'
);

CREATE INDEX IF NOT EXISTS idx_import_batches_account ON import_batches(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);

-- RLS for import_batches
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to import_batches" ON import_batches FOR ALL USING (true);

COMMENT ON COLUMN risks.needs_review IS 'True for AI-imported items pending user review';
COMMENT ON COLUMN pain_points.needs_review IS 'True for AI-imported items pending user review';
COMMENT ON COLUMN action_items.needs_review IS 'True for AI-imported items pending user review';
COMMENT ON TABLE import_batches IS 'Tracks batches of items imported from meeting notes, transcripts, etc.';
