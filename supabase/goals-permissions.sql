-- Grant permissions to anon and authenticated roles
-- Run this in Supabase SQL Editor

-- Grant permissions on goals table
GRANT ALL ON goals TO anon;
GRANT ALL ON goals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on goal_progress table
GRANT ALL ON goal_progress TO anon;
GRANT ALL ON goal_progress TO authenticated;

-- Grant permissions on campaign_goals table
GRANT ALL ON campaign_goals TO anon;
GRANT ALL ON campaign_goals TO authenticated;

-- Make sure RLS is disabled
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_goals DISABLE ROW LEVEL SECURITY;

-- Verify by selecting count
SELECT 'goals' as tbl, count(*) FROM goals
UNION ALL
SELECT 'goal_progress', count(*) FROM goal_progress;
