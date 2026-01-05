-- Custom Buckets (Goals/Workstreams) Schema
-- Allows organizing tracker items into custom groupings beyond 30/60/90 days
-- Run this in Supabase SQL Editor

-- Custom buckets/goals table
CREATE TABLE IF NOT EXISTS buckets (
  bucket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_plan_id UUID NOT NULL REFERENCES account_plans(account_plan_id) ON DELETE CASCADE,
  pursuit_id UUID REFERENCES pursuits(pursuit_id) ON DELETE CASCADE, -- NULL = account-level
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_date DATE, -- optional deadline
  color VARCHAR(20) DEFAULT 'blue', -- UI color theme: blue, green, orange, red, purple, gray
  status VARCHAR(20) DEFAULT 'active', -- active, completed, archived
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buckets_account ON buckets(account_plan_id);
CREATE INDEX IF NOT EXISTS idx_buckets_pursuit ON buckets(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_buckets_status ON buckets(status);

-- Junction table for tagging items to buckets (many-to-many)
-- Items can belong to multiple buckets
CREATE TABLE IF NOT EXISTS bucket_items (
  bucket_id UUID NOT NULL REFERENCES buckets(bucket_id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'risk', 'pain_point', 'action', 'milestone'
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bucket_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_bucket_items_item ON bucket_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_bucket_items_bucket ON bucket_items(bucket_id);

-- Enable RLS
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buckets (allow all for now, can be tightened later)
CREATE POLICY "Allow all access to buckets" ON buckets FOR ALL USING (true);
CREATE POLICY "Allow all access to bucket_items" ON bucket_items FOR ALL USING (true);
