-- Add risk_id column to action_items for linking actions to risks
-- This enables risk roll-up tracking where actions can be associated with risks

ALTER TABLE action_items
ADD COLUMN IF NOT EXISTS risk_id UUID REFERENCES risks(risk_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_action_items_risk ON action_items(risk_id);

-- Comment for documentation
COMMENT ON COLUMN action_items.risk_id IS 'Links action to a specific risk for roll-up tracking';
