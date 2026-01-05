-- ============================================
-- Add Sales Intelligence to Company Profile
-- ============================================

-- Add sales_intelligence JSONB column to company_profile
ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS sales_intelligence JSONB DEFAULT '{
  "target_market": {
    "ideal_customer_profile": "",
    "target_verticals": [],
    "target_company_sizes": [],
    "target_geographies": [],
    "buying_triggers": []
  },
  "value_proposition": {
    "core_value_prop": "",
    "key_differentiators": [],
    "pain_points_addressed": []
  },
  "market_context": {
    "regulations": [],
    "industry_dynamics": "",
    "timing_factors": []
  },
  "competitive": {
    "competitors": [],
    "differentiation": [],
    "common_objections": []
  },
  "evidence": {
    "proof_points": [],
    "customer_stories": [],
    "evidence_gaps": []
  },
  "signals": {
    "positive_indicators": [],
    "disqualifiers": [],
    "urgency_triggers": []
  }
}'::jsonb;

-- Add index for JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_company_profile_sales_intelligence
ON company_profile USING gin (sales_intelligence);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'company_profile'
AND column_name = 'sales_intelligence';
