# Scout Production Audit

**Date:** 2026-01-06
**Status:** Phase 2A Complete - VectorOut Wired to Real Data

---

## Executive Summary

The Scout platform has a working prototype with mock data (`/accounts/[id]/prototype`) that needs to be wired to real data and made the default. The original account layout (`/accounts/[id]`) is fully connected to real data and serves as the reference implementation.

**Key Finding:** The prototype uses `mockData.ts` with hardcoded values. Real data equivalents exist in the database for most mock data structures.

---

## Pages Inventory

| Page | Route | Status | Data Source | Notes |
|------|-------|--------|-------------|-------|
| Dashboard | `/` | Working | Real (Supabase) | Style refinements complete |
| Account Plans List | `/accounts` | Working | Real | Grouped by coverage |
| Account Plan (Original) | `/accounts/[id]` | Working | Real | Keep as `/accounts/[id]/classic` |
| Account Plan (Prototype) | `/accounts/[id]/prototype` | Partial | **MOCK** | **Target for production** |
| Account Explore | `/accounts/[id]/explore` | Working | Real | AI chat interface |
| Account Plan Builder | `/accounts/[id]/plan-builder` | Working | Real | 7-step wizard |
| Account Org Builder | `/accounts/[id]/org-builder` | Working | Real | Org chart |
| Account New | `/accounts/new` | Working | Real | Create from TAM |
| TAM List | `/tam/list` | Working | Real | TAM accounts |
| TAM Detail | `/tam/[id]` | Working | Real | TAM account detail |
| TAM Gaps | `/tam/gaps` | Working | Real | Gap analysis |
| TAM Index | `/tam` | Redirect | Real | Redirects to /tam/list |
| Weekly Review | `/weekly-review` | Working | Real | Account review cards |
| Campaigns (Strategy) | `/campaigns` | Working | Real | Campaign display |
| Campaign Detail | `/campaigns/[id]` | Working | Real | Single campaign |
| Goals | `/goals` | Working | Real | Future: Move to Settings |
| Settings | `/settings` | Working | Real | Company profile, HubSpot config |
| Actions | `/actions` | Working | Real | All action items |
| Pursuits | `/pursuits` | Working | Real | All pursuits |
| Stakeholders | `/stakeholders` | Working | Real | All stakeholders |

---

## Components by Connection Status

### Fully Connected (Real Data)

These components fetch from Supabase correctly:

| Component | Location | Data Tables |
|-----------|----------|-------------|
| RollingTracker | `components/account/RollingTracker.tsx` | action_items, risks, pain_points, buckets |
| StakeholderSection | `components/account/StakeholderSection.tsx` | stakeholders |
| OpportunitiesCard | `components/account/OpportunitiesCard.tsx` | pursuits |
| IntelligenceCard | `components/account/IntelligenceCard.tsx` | account_plans (intelligence fields) |
| SignalsSection | `components/account/SignalsSection.tsx` | account_signals |
| DivisionsCard | `components/account/DivisionsCard.tsx` | account_divisions |
| ARRGoalHero | `components/dashboard/ARRGoalHero.tsx` | pursuits, goals |
| SparkCoverageMetrics | `components/dashboard/SparkCoverageMetrics.tsx` | API: /api/dashboard/spark-metrics |
| HealthDistribution | `components/dashboard/HealthDistribution.tsx` | API: /api/dashboard/health-distribution |
| AccountPlansGroupedList | `components/account-plans/AccountPlansGroupedList.tsx` | account_plans |
| CampaignDetailCard | `components/campaigns/CampaignDetailCard.tsx` | campaigns |

### Mock Data Only (Prototype)

These components use `mockData.ts`:

| Component | Location | Mock Data Used | Real Data Equivalent |
|-----------|----------|----------------|---------------------|
| VectorOutExecutionMode | `components/account/VectorOut/ExecutionMode.tsx` | MOCK_VECTOR_OUT.sparks, pursuits, action_items, etc. | scout_themes, pursuits, action_items |
| VectorOutDiscoveryMode | `components/account/VectorOut/DiscoveryMode.tsx` | MOCK_VECTOR_OUT.discovery_status | Needs calculation logic |
| VectorInExecutionMode | `components/account/VectorIn/ExecutionMode.tsx` | MOCK_VECTOR_IN.issues, patterns, contacts | **No DB tables yet** |
| VectorInDiscoveryMode | `components/account/VectorIn/DiscoveryMode.tsx` | MOCK_VECTOR_IN.discovery_status | Needs calculation logic |
| PrototypeHealthBanner | `components/prototype/PrototypeHealthBanner.tsx` | calculateHealthStatus() | account_health_scores |
| VectorTabs | `components/prototype/VectorTabs.tsx` | N/A (UI only) | N/A |

### Placeholder/Partial

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| ExternalSourcesPanel | `components/account/ExternalSourcesPanel.tsx` | Placeholder | Shows mock URLs, needs config UI |
| SparkDealLinker | `components/account/SparkDealLinker.tsx` | Partial | UI exists, may need API wiring |
| SparkStatusSelector | `components/account/SparkStatusSelector.tsx` | Partial | UI exists, may need API wiring |
| HealthScoreBadge | `components/account/HealthScoreBadge.tsx` | Partial | Component exists, needs data |

---

## API Routes Status

### Working (Verified)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/accounts` | GET/POST | Account CRUD |
| `/api/accounts/[id]` | GET/PATCH/DELETE | Single account |
| `/api/accounts/[id]/actions` | GET/POST | Account actions |
| `/api/accounts/[id]/risks` | GET/POST | Account risks |
| `/api/accounts/[id]/risks/[riskId]` | PATCH/DELETE | Risk CRUD |
| `/api/accounts/[id]/pain-points` | GET/POST | Pain points |
| `/api/accounts/[id]/pain-points/[painPointId]` | PATCH/DELETE | Pain point CRUD |
| `/api/accounts/[id]/stakeholders` | GET/POST | Stakeholders |
| `/api/accounts/[id]/buckets` | GET/POST | Buckets |
| `/api/accounts/[id]/buckets/[bucketId]` | PATCH/DELETE | Bucket CRUD |
| `/api/accounts/[id]/divisions` | GET/POST | Divisions |
| `/api/accounts/[id]/signals` | GET/POST | AI signals |
| `/api/accounts/[id]/intelligence` | GET/PATCH | Account intelligence |
| `/api/accounts/[id]/health` | GET | Health score |
| `/api/pursuits` | GET/POST | Pursuits |
| `/api/stakeholders` | GET/POST | Global stakeholders |
| `/api/scout-themes` | GET/POST | Sparks |
| `/api/scout-themes/[id]` | PATCH/DELETE | Spark CRUD |
| `/api/sparks/[id]/link` | POST | Link spark to pursuit |
| `/api/dashboard/spark-metrics` | GET | Dashboard metrics |
| `/api/dashboard/health-distribution` | GET | Health distribution |
| `/api/campaigns` | GET | Campaign list |
| `/api/tam/[id]` | GET/PATCH | TAM account |
| `/api/weekly-review` | GET | Weekly review accounts |
| `/api/action-items` | GET/POST | Global action items |
| `/api/action-items/[id]` | PATCH/DELETE | Action item CRUD |

### AI Routes (Working)

| Route | Purpose |
|-------|---------|
| `/api/ai/chat` | General AI chat |
| `/api/ai/research` | Account research |
| `/api/ai/contextual-research` | Contextual research |
| `/api/ai/org-structure` | Org chart generation |
| `/api/ai/org-gaps` | Org gap analysis |
| `/api/ai/explore-themes` | Spark exploration |
| `/api/ai/plan-builder` | Plan generation |
| `/api/ai/planning-wizard` | Planning wizard |
| `/api/ai/suggestions` | AI suggestions |
| `/api/ai/tam-intelligence` | TAM intelligence |
| `/api/ai/research-people` | People research |
| `/api/ai/revenue-theory` | Revenue theory |

---

## Migration Status

| Migration File | Purpose | Status |
|----------------|---------|--------|
| `20250102_weekly_review_favorites.sql` | Weekly review favorites | **Verify** |
| `20250104_add_weighted_value.sql` | Weighted values | **Verify** |
| `20250104_pursuit_deal_tracking.sql` | Deal tracking | **Verify** |
| `20260105_two_vector_tables.sql` | Vector In tables (issues, patterns) | **Verify** |
| `20260106_spark_metrics_health.sql` | spark_metrics view, health tables | **Verify** |
| `20260106_spark_campaign_link.sql` | campaign_id on scout_themes | **Verify** |
| `20260106_external_sources.sql` | slack/jira/asana URLs | **Verify** |

**Note:** Cannot run `supabase db diff` - Docker not available. Manual verification needed.

---

## Gaps to Address

### Phase 2: Connect Data (Prototype → Real)

#### High Priority

1. **VectorOutExecutionMode needs real data**
   - Current: Uses MOCK_VECTOR_OUT
   - Needed: Fetch from scout_themes, pursuits, action_items, risks, pain_points, stakeholders
   - Tables exist, just need to wire

2. **PrototypeHealthBanner needs real calculation**
   - Current: Uses calculateHealthStatus(MOCK_VECTOR_OUT, MOCK_VECTOR_IN)
   - Needed: Fetch from account_health_scores or calculate from account data
   - API exists: `/api/accounts/[id]/health`

3. **Prototype page needs real account data**
   - Current: Uses MOCK_ACCOUNT
   - Needed: Fetch account from account_plans table
   - Route exists, just need to wire

#### Medium Priority

4. **VectorInExecutionMode needs tables**
   - Current: Uses MOCK_VECTOR_IN (issues, patterns, contacts)
   - Needed: Tables from `20260105_two_vector_tables.sql` migration
   - **Verify migration applied before wiring**

5. **Discovery status calculation**
   - Current: Hardcoded in mockData.ts
   - Needed: Calculate from actual data completeness
   - Logic to write, no DB changes

### Phase 3: Complete Functionality

6. **ExternalSourcesPanel configuration UI**
   - Current: Placeholder with mock URLs
   - Needed: Form to save URLs to account_plans columns
   - Columns exist (if migration applied)

7. **Spark linking UI polish**
   - Components exist: SparkDealLinker, SparkStatusSelector
   - Verify they work end-to-end

### Phase 4: Validate

8. **Error handling audit**
   - Many components lack loading/error states
   - Add consistent pattern across prototype

9. **Empty state handling**
   - Prototype doesn't handle zero data gracefully

### Future (Document Only)

10. **Campaign authoring UI** - Not in scope for hardening
11. **Goals → Settings relocation** - Not in scope for hardening
12. **Vector In data ingestion** - Needs external integration (Jira/Zendesk)

---

## Database Tables in Use

| Table | Used By | CRUD Status | Notes |
|-------|---------|-------------|-------|
| account_plans | Multiple | Full CRUD | Core table |
| pursuits | Account Plan, Dashboard | Full CRUD | Opportunities |
| action_items | Account Plan, Actions | Full CRUD | 30/60/90 tracker |
| risks | Account Plan | Full CRUD | Risk management |
| pain_points | Account Plan | Full CRUD | Pain tracking |
| stakeholders | Account Plan | Full CRUD | Contact management |
| scout_themes | Account Plan (Sparks) | Full CRUD | Spark/theme tracking |
| account_divisions | Account Plan | Full CRUD | Org structure |
| buckets | Account Plan | Full CRUD | Action grouping |
| account_signals | Account Plan | Full CRUD | AI signals |
| tam_accounts | TAM | Full CRUD | TAM list |
| goals | Goals, Dashboard | Full CRUD | ARR goals |
| campaigns | Campaigns | Read only | Campaign display |
| company_profile | Settings | Full CRUD | Company settings |
| engagement_logs | Account Plan | Full CRUD | Meeting notes |
| review_notes | Account Plan | Full CRUD | Review notes |

### Views (May need verification)

| View | Purpose | Status |
|------|---------|--------|
| spark_metrics | Dashboard metrics | **Verify exists** |
| health_distribution | Health distribution | **Verify exists** |

### Tables from Recent Migrations (Verify)

| Table | Migration | Purpose |
|-------|-----------|---------|
| account_health_scores | 20260106_spark_metrics_health.sql | Health scoring |
| cs_issues | 20260105_two_vector_tables.sql | Vector In issues |
| cs_patterns | 20260105_two_vector_tables.sql | Vector In patterns |
| cs_resolution_items | 20260105_two_vector_tables.sql | Vector In resolutions |

---

## Style Refinements (Already Complete)

The following style changes were made prior to this audit:

1. Dashboard CRM colors muted (ARRGoalHero.tsx)
2. Scout Intelligence Impact section compacted (SparkCoverageMetrics.tsx)
3. Dashboard spacing reduced (page.tsx, ScoutActivityLayer.tsx)
4. IntelligenceSummary compacted
5. HealthDistribution compacted
6. External Sources Panel created (placeholder)
7. Tracker max-height added (RollingTracker.tsx, VectorOut/ExecutionMode.tsx)

---

## Recommended Execution Order

### Phase 2A: Connect VectorOut Data (COMPLETE)

**Completed 2026-01-06:**

1. ✅ Verified migrations are applied (via Supabase console SQL query)
   - `spark_metrics` view - EXISTS
   - `health_distribution` view - EXISTS
   - `account_health_scores` table - EXISTS
   - `scout_themes.campaign_id` - EXISTS
   - `account_plans.slack_channel_url` - EXISTS
   - Vector In tables (`cs_issues`, `cs_patterns`) - **MISSING** (deferred)

2. ✅ Created server component wrapper (`page.tsx`) that fetches real data:
   - Fetches from `account_plans`, `pursuits`, `stakeholders`, `action_items`, `risks`, `pain_points`, `account_divisions`, `scout_themes`, `account_signals`
   - Transforms data to match component interfaces

3. ✅ Created client component (`PrototypePageClient.tsx`) receiving real data props

4. ✅ Wired VectorOutExecutionMode to real data:
   - `sparks` ← `scout_themes` table
   - `pursuits` ← `pursuits` table
   - `actionItems` ← `action_items` table (with bucket calculation)
   - `painPoints` ← `pain_points` table
   - `risks` ← `risks` table
   - `signals` ← `account_signals` table
   - `stakeholders` ← `stakeholders` table

5. ✅ Wired PrototypeHealthBanner to real data:
   - Pipeline value from real pursuits
   - Health calculation based on pipeline + P1 count
   - Signals from real `account_signals`

6. ✅ VectorIn remains on mock data (placeholder notice shown)

7. ✅ Build passes with no type errors

### Phase 2B: Connect VectorIn Data (PENDING)
Requires database migration for:
- `cs_issues` table
- `cs_patterns` table
- `cs_resolution_items` table

### Phase 3: Complete Functionality
1. Add ExternalSourcesPanel configuration UI
2. Verify Spark linking works end-to-end
3. Add discovery status calculation

### Phase 4: Validate
1. Add loading states to prototype components
2. Add error handling to prototype components
3. Add empty state handling

### Phase 5: Ship
1. Rename `/accounts/[id]` → `/accounts/[id]/classic`
2. Rename `/accounts/[id]/prototype` → `/accounts/[id]`
3. Remove prototype banner
4. Final QA pass

---

## Protected Flows Confirmation

These flows have been identified and will NOT be modified:

1. **TAM → Account Plan Onboarding** - Working, protected
2. **7-Step Enrichment Wizard** - Working, protected
3. **30/60/90 Day Tracker (Original)** - Working, protected
4. **Action Items CRUD** - Working, protected
5. **Risks CRUD** - Working, protected
6. **Stakeholders CRUD** - Working, protected
7. **Dashboard Data Display** - Working, protected (style changes only)

---

**Audit Status:** Phase 2A Complete
**Next Step:** Phase 2B (VectorIn) requires database migration, or proceed to Phase 3 (functionality)

---

*Generated: 2026-01-06*
