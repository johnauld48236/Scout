-- Add pursuit_type to distinguish new business from recurring revenue
-- This allows the UI to group and collapse recurring revenue opportunities

-- Add the pursuit_type column
ALTER TABLE pursuits
ADD COLUMN IF NOT EXISTS pursuit_type VARCHAR(50) DEFAULT 'new_business';

-- Create an index for filtering by type
CREATE INDEX IF NOT EXISTS idx_pursuits_type ON pursuits(pursuit_type);

-- Valid values: 'new_business', 'renewal', 'expansion', 'recurring'
COMMENT ON COLUMN pursuits.pursuit_type IS 'Type of opportunity: new_business, renewal, expansion, recurring';
