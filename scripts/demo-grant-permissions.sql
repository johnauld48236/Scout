-- ============================================
-- GRANT PERMISSIONS FOR SUPABASE ANON/AUTH ROLES
-- Run this AFTER creating tables
-- ============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant all permissions on all tables to anon and authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant all permissions on all sequences (for auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;

-- Specifically grant on each critical table (belt and suspenders)
GRANT ALL ON account_plans TO anon, authenticated;
GRANT ALL ON stakeholders TO anon, authenticated;
GRANT ALL ON pursuits TO anon, authenticated;
GRANT ALL ON action_items TO anon, authenticated;
GRANT ALL ON risks TO anon, authenticated;
GRANT ALL ON pain_points TO anon, authenticated;
GRANT ALL ON scout_themes TO anon, authenticated;
GRANT ALL ON account_divisions TO anon, authenticated;
GRANT ALL ON account_signals TO anon, authenticated;
GRANT ALL ON buckets TO anon, authenticated;
GRANT ALL ON bucket_items TO anon, authenticated;
GRANT ALL ON engagement_logs TO anon, authenticated;
GRANT ALL ON division_product_usage TO anon, authenticated;
GRANT ALL ON campaigns TO anon, authenticated;
GRANT ALL ON company_profile TO anon, authenticated;
GRANT ALL ON goals TO anon, authenticated;
GRANT ALL ON tam_accounts TO anon, authenticated;
GRANT ALL ON tam_contacts TO anon, authenticated;
GRANT ALL ON tam_warm_paths TO anon, authenticated;
GRANT ALL ON pursuit_stakeholders TO anon, authenticated;
GRANT ALL ON review_notes TO anon, authenticated;
GRANT ALL ON import_batches TO anon, authenticated;
GRANT ALL ON success_milestones TO anon, authenticated;
GRANT ALL ON campaign_tam_accounts TO anon, authenticated;
GRANT ALL ON campaign_goals TO anon, authenticated;

-- Verify: list table permissions (run separately to check)
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
-- ORDER BY table_name, grantee;
