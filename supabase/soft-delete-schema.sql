-- Add soft delete support to allow undo functionality
-- Items are marked as deleted rather than permanently removed

-- Add deleted_at column to risks
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to pain_points
ALTER TABLE pain_points
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to action_items
ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for efficient filtering of non-deleted items
CREATE INDEX IF NOT EXISTS idx_risks_not_deleted ON risks(account_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pain_points_not_deleted ON pain_points(account_plan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_not_deleted ON action_items(account_plan_id) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN risks.deleted_at IS 'Timestamp when item was soft-deleted, NULL if active';
COMMENT ON COLUMN pain_points.deleted_at IS 'Timestamp when item was soft-deleted, NULL if active';
COMMENT ON COLUMN action_items.deleted_at IS 'Timestamp when item was soft-deleted, NULL if active';
