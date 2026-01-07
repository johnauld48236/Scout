-- ============================================
-- SCOUT SPARK METRICS + HEALTH SCORING
-- Migration: 20260106_spark_metrics_health.sql
--
-- CORRECTIONS FROM SPEC:
-- - Uses account_plans(account_plan_id) not accounts(id)
-- - Uses pursuits(pursuit_id) not pursuits(id)
-- - Uses gen_random_uuid() not uuid_generate_v4()
-- - Uses estimated_value not value
-- - Implements dual Spark linking model
-- ============================================

-- 1. ADD SPARK LINKING TO SCOUT_THEMES
-- ============================================

-- Add linked_pursuit_id for Spark-to-Deal association (ENRICHMENT)
-- This is SEPARATE from converted_to_pursuit_id (NET NEW)
ALTER TABLE scout_themes
ADD COLUMN IF NOT EXISTS linked_pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE SET NULL;

-- Add estimated value range for Sparks
ALTER TABLE scout_themes
ADD COLUMN IF NOT EXISTS estimated_value_low DECIMAL;

ALTER TABLE scout_themes
ADD COLUMN IF NOT EXISTS estimated_value_high DECIMAL;

-- Index for linked deals (enrichment tracking)
CREATE INDEX IF NOT EXISTS idx_scout_themes_linked_pursuit
ON scout_themes(linked_pursuit_id)
WHERE linked_pursuit_id IS NOT NULL;

-- Index for converted deals (net new tracking)
CREATE INDEX IF NOT EXISTS idx_scout_themes_converted_pursuit
ON scout_themes(converted_to_pursuit_id)
WHERE converted_to_pursuit_id IS NOT NULL;

-- 2. MIGRATE STATUS ENUM VALUES
-- ============================================

-- Migrate 'validated' to 'linked'
UPDATE scout_themes SET status = 'linked' WHERE status = 'validated';

-- Migrate 'dismissed' to 'closed'
UPDATE scout_themes SET status = 'closed' WHERE status = 'dismissed';

-- 3. CREATE ACCOUNT HEALTH SCORES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS account_health_scores (
  health_score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,

  -- Component scores (0-25 each)
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 25),
  momentum_score INTEGER DEFAULT 0 CHECK (momentum_score >= 0 AND momentum_score <= 25),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 25),
  intelligence_score INTEGER DEFAULT 0 CHECK (intelligence_score >= 0 AND intelligence_score <= 25),

  -- Health band (derived from total)
  health_band VARCHAR(20) NOT NULL DEFAULT 'monitor',

  -- Learning metadata - stores raw inputs for pattern analysis
  score_inputs JSONB DEFAULT '{}',

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One score per account
  CONSTRAINT unique_account_plan_health UNIQUE (account_plan_id)
);

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_health_scores_band
ON account_health_scores(health_band);

-- Index for account lookups
CREATE INDEX IF NOT EXISTS idx_health_scores_account_plan
ON account_health_scores(account_plan_id);

-- 4. CREATE VIEW FOR SPARK METRICS (DUAL TRACKING)
-- ============================================

CREATE OR REPLACE VIEW spark_metrics AS
SELECT
  -- Sparks Active (exploring or linked)
  (SELECT COUNT(*) FROM scout_themes WHERE status IN ('exploring', 'linked')) AS sparks_active,

  -- NET NEW: Sparks that created new deals
  (SELECT COUNT(*) FROM scout_themes WHERE converted_to_pursuit_id IS NOT NULL) AS sparks_converted,

  -- ENRICHMENT: Sparks linked to existing deals
  (SELECT COUNT(*) FROM scout_themes WHERE linked_pursuit_id IS NOT NULL AND converted_to_pursuit_id IS NULL) AS sparks_linked,

  -- Pipeline Created (from converted sparks - NET NEW)
  (SELECT COALESCE(SUM(p.estimated_value), 0)
   FROM pursuits p
   WHERE p.pursuit_id IN (SELECT converted_to_pursuit_id FROM scout_themes WHERE converted_to_pursuit_id IS NOT NULL)
  ) AS pipeline_created,

  -- Pipeline Enriched (from linked sparks - existing deals with Scout coverage)
  (SELECT COALESCE(SUM(p.estimated_value), 0)
   FROM pursuits p
   WHERE p.pursuit_id IN (SELECT linked_pursuit_id FROM scout_themes WHERE linked_pursuit_id IS NOT NULL AND converted_to_pursuit_id IS NULL)
  ) AS pipeline_enriched,

  -- Total Pipeline Value (non-closed deals)
  (SELECT COALESCE(SUM(estimated_value), 0)
   FROM pursuits
   WHERE stage NOT IN ('closed_won', 'closed_lost')
  ) AS total_pipeline_value,

  -- Covered Deals Count (either linked or converted)
  (SELECT COUNT(DISTINCT p.pursuit_id)
   FROM pursuits p
   WHERE p.pursuit_id IN (
     SELECT linked_pursuit_id FROM scout_themes WHERE linked_pursuit_id IS NOT NULL
     UNION
     SELECT converted_to_pursuit_id FROM scout_themes WHERE converted_to_pursuit_id IS NOT NULL
   )
  ) AS covered_deals_count,

  -- Total Active Deals Count
  (SELECT COUNT(*)
   FROM pursuits
   WHERE stage NOT IN ('closed_won', 'closed_lost')
  ) AS total_deals_count,

  -- TAM Accounts Available (not enriched)
  (SELECT COUNT(*)
   FROM tam_accounts
   WHERE enrichment_status IS NULL OR enrichment_status != 'enriched'
  ) AS tam_accounts_available,

  -- TAM Accounts Enriched
  (SELECT COUNT(*)
   FROM tam_accounts
   WHERE enrichment_status = 'enriched'
  ) AS tam_accounts_enriched,

  -- Total TAM Accounts
  (SELECT COUNT(*) FROM tam_accounts) AS tam_accounts_total;

-- 5. CREATE VIEW FOR HEALTH DISTRIBUTION
-- ============================================

CREATE OR REPLACE VIEW health_distribution AS
SELECT
  health_band,
  COUNT(*) AS count
FROM account_health_scores
GROUP BY health_band;

-- 6. ADD TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_health_score_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_score_updated_at ON account_health_scores;
CREATE TRIGGER health_score_updated_at
  BEFORE UPDATE ON account_health_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_health_score_timestamp();

-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE account_health_scores IS 'Generic health scoring framework v1 - stores component scores and learning metadata';
COMMENT ON COLUMN account_health_scores.score_inputs IS 'JSONB storing raw inputs that drove the score - used for pattern learning and refinement';
COMMENT ON COLUMN account_health_scores.health_band IS 'Derived band: healthy (80-100), monitor (60-79), at_risk (40-59), critical (0-39)';

COMMENT ON VIEW spark_metrics IS 'Aggregated Spark metrics with dual tracking: Net New (converted) vs Enrichment (linked)';
COMMENT ON VIEW health_distribution IS 'Count of accounts by health band for dashboard display';

COMMENT ON COLUMN scout_themes.linked_pursuit_id IS 'ENRICHMENT: Spark tracks/enriches an existing deal in the pipeline';
COMMENT ON COLUMN scout_themes.converted_to_pursuit_id IS 'NET NEW: Spark was converted into a new deal (pipeline created from intelligence)';
