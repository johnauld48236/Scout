-- Add campaign_ids column to account_plans table
-- Run this in your Supabase SQL editor

ALTER TABLE account_plans ADD COLUMN IF NOT EXISTS campaign_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN account_plans.campaign_ids IS 'Campaign IDs assigned to this account plan';
