-- Add bucket and slip handling columns to action_items
-- These support the 30/60/90 day planning feature

-- Bucket column: '30', '60', or '90' for rolling time windows
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS bucket VARCHAR(10);

-- Slip acknowledged: true when user acknowledges an item slipped
-- Item rolls forward to next bucket when acknowledged
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS slip_acknowledged BOOLEAN DEFAULT FALSE;

-- Create index for bucket queries
CREATE INDEX IF NOT EXISTS idx_actions_bucket ON action_items(bucket);
