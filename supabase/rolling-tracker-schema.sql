-- ============================================
-- ROLLING TRACKER SCHEMA
-- Adds target_date fields for 30/60/90 day tracking
-- ============================================

-- Add target_date to risks table for forward-looking tracking
ALTER TABLE risks ADD COLUMN IF NOT EXISTS target_date DATE;

-- Add index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_risks_target_date ON risks(target_date);

-- Add target_date to pain_points table for tracking when to address
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS target_date DATE;

-- Add index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_pain_points_target_date ON pain_points(target_date);

-- Comments
COMMENT ON COLUMN risks.target_date IS 'Target resolution date for bucketing into 30/60/90 day periods';
COMMENT ON COLUMN pain_points.target_date IS 'Target date for when this pain point should be addressed';
