-- Add instructions field to buckets table
-- Run this in Supabase SQL Editor

ALTER TABLE buckets ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Also ensure pursuit_id exists on risks and pain_points for deal linking
-- (These may already exist, but adding IF NOT EXISTS makes it safe to run)
ALTER TABLE risks ADD COLUMN IF NOT EXISTS pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL;
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL;

-- Create indexes for deal lookups
CREATE INDEX IF NOT EXISTS idx_risks_pursuit ON risks(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_pursuit ON pain_points(pursuit_id);
