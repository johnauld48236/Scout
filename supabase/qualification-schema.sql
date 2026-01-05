-- ============================================
-- QUALIFICATION ANALYSES TABLE
-- Supports multiple sales methodologies
-- ============================================

-- Add methodology and generic scores to bant_analyses for flexibility
ALTER TABLE bant_analyses
ADD COLUMN IF NOT EXISTS methodology VARCHAR(50) DEFAULT 'BANT';

ALTER TABLE bant_analyses
ADD COLUMN IF NOT EXISTS criteria_scores JSONB;

-- Add comments
COMMENT ON COLUMN bant_analyses.methodology IS 'Sales methodology used: BANT, MEDDICC, MEDDPICC, SPIN, Challenger, Custom';
COMMENT ON COLUMN bant_analyses.criteria_scores IS 'Generic scores object for non-BANT methodologies: { criterion_name: { score, evidence, notes } }';

-- Create index for methodology filtering
CREATE INDEX IF NOT EXISTS idx_bant_analyses_methodology ON bant_analyses(methodology);
