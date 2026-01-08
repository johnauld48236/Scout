-- Demo Environment Schema Migration
-- Run this AFTER replicating the base schema from scout-c2a-prod

-- Step 2: Add new columns to scout_themes table for Vector In support
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS vector VARCHAR(10) DEFAULT 'out';
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS health_impact VARCHAR(20);
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scout_themes_vector ON scout_themes(vector);
CREATE INDEX IF NOT EXISTS idx_scout_themes_account_vector ON scout_themes(account_plan_id, vector);

-- Ensure other required columns exist (in case they're missing)
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS bucket VARCHAR(10);
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS initiative_id UUID REFERENCES buckets(bucket_id);

ALTER TABLE risks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS bucket VARCHAR(10);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS initiative_id UUID REFERENCES buckets(bucket_id);

ALTER TABLE action_items ADD COLUMN IF NOT EXISTS initiative_id UUID REFERENCES buckets(bucket_id);

-- Verify columns exist
-- Run this to check: SELECT column_name FROM information_schema.columns WHERE table_name = 'scout_themes';
