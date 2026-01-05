-- Add date_type to distinguish explicit vs soft dates
-- 'explicit' = user set a specific date
-- 'soft' = auto-assigned from time window (30/60/90)

ALTER TABLE risks ADD COLUMN IF NOT EXISTS
  date_type VARCHAR(20) DEFAULT 'soft';

ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS
  date_type VARCHAR(20) DEFAULT 'soft';

-- Set existing items with dates to 'explicit' (conservative assumption)
UPDATE risks SET date_type = 'explicit' WHERE target_date IS NOT NULL AND date_type IS NULL;
UPDATE pain_points SET date_type = 'explicit' WHERE target_date IS NOT NULL AND date_type IS NULL;

-- Items without dates default to 'soft' (will be set when assigned)
UPDATE risks SET date_type = 'soft' WHERE target_date IS NULL;
UPDATE pain_points SET date_type = 'soft' WHERE target_date IS NULL;

COMMENT ON COLUMN risks.date_type IS 'explicit = user set specific date, soft = auto-assigned from window';
COMMENT ON COLUMN pain_points.date_type IS 'explicit = user set specific date, soft = auto-assigned from window';
