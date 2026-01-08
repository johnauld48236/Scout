# Demo Environment Setup Guide

## Overview
This guide walks through setting up the demo environment at scoutsignal.ai with 3 demo accounts.

## Demo Accounts

| Account | Health Status | Key Scenario |
|---------|---------------|--------------|
| **Apex Manufacturing** | CRITICAL | At-risk enterprise account with escalations |
| **Meridian Health Systems** | HEALTHY | Strategic account with expansion opportunities |
| **Cobalt Systems Inc** | MONITOR | Mixed signals, renewal at risk |

---

## Step 1: Schema Replication

### Option A: Using Supabase Dashboard
1. Go to scout-c2a-prod project in Supabase
2. Database > Tables
3. For each table, click "Definition" and copy the CREATE TABLE statement
4. Apply to scout-demo project

### Option B: Using pg_dump (faster)
```bash
# Export schema only (no data)
pg_dump -h <prod-host> -U postgres -d postgres --schema-only -f schema.sql

# Apply to demo
psql -h <demo-host> -U postgres -d postgres -f schema.sql
```

**Required tables:**
- account_plans
- stakeholders
- account_divisions
- division_product_usage
- pursuits
- risks
- pain_points
- action_items
- scout_themes
- buckets
- account_signals

---

## Step 2: Run Schema Migration

After replicating base schema, run the migration to add new columns:

```bash
psql -h <demo-host> -U postgres -d postgres -f scripts/demo-schema-migration.sql
```

Or paste into Supabase SQL Editor:
```sql
-- Add new columns for Vector In support
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS vector VARCHAR(10) DEFAULT 'out';
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS health_impact VARCHAR(20);
ALTER TABLE scout_themes ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scout_themes_vector ON scout_themes(vector);
CREATE INDEX IF NOT EXISTS idx_scout_themes_account_vector ON scout_themes(account_plan_id, vector);

-- Ensure other columns exist
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS bucket VARCHAR(10);
ALTER TABLE pain_points ADD COLUMN IF NOT EXISTS initiative_id UUID;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS bucket VARCHAR(10);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS initiative_id UUID;

ALTER TABLE action_items ADD COLUMN IF NOT EXISTS initiative_id UUID;
```

---

## Step 3: Seed Demo Data

Run the seed script to create the 3 demo accounts:

```bash
psql -h <demo-host> -U postgres -d postgres -f scripts/demo-seed.sql
```

Or paste the contents of `scripts/demo-seed.sql` into Supabase SQL Editor.

---

## Step 4: Configure Vercel Environment

Set these environment variables in Vercel for the scoutsignal.ai deployment:

```
NEXT_PUBLIC_SUPABASE_URL=<scout-demo-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<scout-demo-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<scout-demo-service-role-key>
```

**Important:** These should point to scout-demo, NOT scout-c2a-prod.

---

## Step 5: Deploy

After environment is configured:

```bash
git add .
git commit -m "feat: Add Vector In support (Missions, Hazards, Field Requests)

- Add MissionDrawer for Vector In (like Trails but with health_impact)
- Update MOMs import flow to route risks/requests properly
- Fix initiative_id handling across tracker components
- Add Past Due section to both vectors
- Update data mappings for full field support

🤖 Generated with Claude Code"

git push origin main
```

Vercel will automatically deploy to scoutsignal.ai.

---

## Verification Checklist

After deployment, verify:

- [ ] Homepage loads at scoutsignal.ai
- [ ] 3 demo accounts appear in territory list
- [ ] Apex Manufacturing shows Critical health badge
- [ ] Meridian Health shows Healthy badge
- [ ] Vector Out shows Trails with linked pursuits
- [ ] Vector In shows Missions with health_impact badges
- [ ] Past Due section shows overdue items
- [ ] Import Notes creates items in correct tables
- [ ] MissionDrawer opens/saves/deletes correctly

---

## Demo Account Details

### Apex Manufacturing (CRITICAL)
- **NPS:** -15, **CSAT:** 55
- **Key Risks:** Executive sponsor departure, Performance issues, Competitor demo
- **Missions:** Q1 Stabilization, Executive Re-engagement
- **Scenario:** Fire drill mode - critical escalations need immediate attention

### Meridian Health (HEALTHY)
- **NPS:** 72, **CSAT:** 92
- **Pipeline:** $950K in active opportunities
- **Trails:** Network-wide Rollout, Cardiology Integration
- **Scenario:** Land and expand - happy customer with growth potential

### Cobalt Systems (MONITOR)
- **NPS:** 35, **CSAT:** 72
- **Key Risks:** Renewal at risk, Low Engineering adoption
- **Missions:** SSO Resolution, Adoption Workshop
- **Scenario:** Save the account - mixed signals before renewal
