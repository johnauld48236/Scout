-- ============================================
-- ADD SALES METHODOLOGY TO COMPANY PROFILE
-- Allows configuration of qualification framework
-- ============================================

-- Add sales methodology column
ALTER TABLE company_profile
ADD COLUMN IF NOT EXISTS sales_methodology VARCHAR(50) DEFAULT 'BANT';

-- Add custom methodology criteria (for 'Custom' selection)
ALTER TABLE company_profile
ADD COLUMN IF NOT EXISTS custom_methodology_criteria TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN company_profile.sales_methodology IS 'Sales qualification methodology: BANT, MEDDICC, MEDDPICC, SPIN, Challenger, or Custom';
COMMENT ON COLUMN company_profile.custom_methodology_criteria IS 'Custom qualification criteria when sales_methodology is Custom';
