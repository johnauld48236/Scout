-- Add metadata fields to buckets table
-- These allow tracking importance, due dates, and descriptions for buckets

-- Add importance/priority field
ALTER TABLE buckets
ADD COLUMN IF NOT EXISTS importance VARCHAR(20) DEFAULT 'medium';

-- Note: description and target_date columns already exist in the original schema

-- Add comment
COMMENT ON COLUMN buckets.importance IS 'Priority level: critical, high, medium, low';
