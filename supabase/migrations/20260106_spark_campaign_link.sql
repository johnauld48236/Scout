-- ============================================
-- SPARK-CAMPAIGN ASSOCIATION
-- Migration: 20260106_spark_campaign_link.sql
--
-- Adds campaign_id to scout_themes so Sparks
-- can be associated with campaigns
-- ============================================

-- Add campaign_id to scout_themes
ALTER TABLE scout_themes
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL;

-- Index for campaign-based queries
CREATE INDEX IF NOT EXISTS idx_scout_themes_campaign
ON scout_themes(campaign_id)
WHERE campaign_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN scout_themes.campaign_id IS 'Campaign this Spark is associated with - enables filtering Sparks by campaign and tracking campaign pipeline';
