# CLAUDE.md - Scout Sales Intelligence Platform

## READ THIS FIRST

This document is the **single source of truth** for the Scout application architecture.

**IMPORTANT:** This document has two sections:
- **CURRENT STATE** - What actually exists today. Use this for all code changes.
- **PLANNED CHANGES** (at bottom) - Future improvements. Do NOT implement unless explicitly asked.

Before making ANY changes:
1. Read the relevant section of this document
2. Follow the patterns and rules defined here
3. Do NOT create duplicate components or tables
4. Do NOT invent new patterns - use existing ones
5. Run `npm run build` after changes

---

## Project Overview

Scout is a B2B sales intelligence platform for managing:
- **Account Plans** - Strategic accounts with stakeholders, pursuits, and intelligence
- **TAM (Target Account Model)** - Prospect pipeline and prioritization
- **Pursuits** - Sales opportunities linked to accounts
- **Weekly Reviews** - Forecasting and account health tracking
- **Goals & Gap Analysis** - Revenue and new logo target tracking

### Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| React | 19.2.3 |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API |
| Styling | Tailwind CSS 4 |
| TypeScript | Strict mode enabled |

### Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build - USE THIS TO VERIFY CHANGES
npm run lint     # Run ESLint
```

**No test runner configured** - Always run `npm run build` to catch errors.

---

## ⚠️ CRITICAL RULES

### Before ANY Code Change:
1. **Read the relevant files first** - Don't assume how things work
2. **Identify cascade effects** - What else uses this code?
3. **State your plan** - Tell the user what you're going to change and what might break
4. **Don't create new components** when existing ones should be modified
5. **Run `npm run build`** after changes to verify nothing breaks

### Never Do These Things:
- Create duplicate components - always check if one exists first
- Mix up severity values between tables (see Business Rules section)
- Modify the AI context builder without understanding all 4 layers
- Delete or rename database columns without understanding FK cascades
- Create new API routes when existing routes should be extended

---

# ═══════════════════════════════════════════════════════════════════════════════
# CURRENT STATE - What actually exists today
# ═══════════════════════════════════════════════════════════════════════════════

## File Structure (CURRENT)

```
src/
├── app/                    # Next.js App Router pages
│   ├── accounts/           # Account plan pages
│   ├── actions/            # Action items global view
│   ├── api/                # API routes
│   ├── campaigns/          # Campaign management
│   ├── goals/              # Goals management
│   ├── pursuits/           # Opportunities
│   ├── settings/           # App settings
│   ├── stakeholders/       # Contacts
│   ├── tam/                # TAM Intelligence
│   │   ├── page.tsx        # TAM Overview
│   │   ├── list/           # TAM account list
│   │   ├── [id]/           # TAM account detail
│   │   └── gaps/           # Gap Analysis
│   ├── weekly-review/      # Weekly review
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Dashboard
├── components/             # React components
│   ├── account/            # Account page components (38 files)
│   ├── dashboard/          # Dashboard components
│   ├── planning/           # Planning components
│   ├── tam/                # TAM components
│   ├── wizard/             # Account creation wizard (7 steps)
│   └── ui/                 # Shared UI components
├── lib/                    # Utilities and helpers
│   ├── ai/                 # AI integration
│   │   └── context/        # Context builder system
│   ├── supabase/           # Supabase client
│   └── utils/              # Shared utilities
└── types/                  # TypeScript types
```

---

## Data Model (CURRENT)

### Core Tables

#### account_plans
Primary table for managed accounts. **Everything flows through this.**

| Column | Type | Notes |
|--------|------|-------|
| account_plan_id | UUID | Primary key |
| company_name | VARCHAR(255) | Required |
| website | VARCHAR(255) | |
| vertical | VARCHAR(100) | Industry vertical |
| account_type | VARCHAR(50) | 'prospect', 'customer' |
| account_thesis | TEXT | Strategic positioning |
| is_favorite | BOOLEAN | Default FALSE |
| in_weekly_review | BOOLEAN | Default FALSE |
| last_reviewed_at | TIMESTAMPTZ | When marked reviewed |
| last_reviewed_by | VARCHAR(255) | Who reviewed |
| business_units | JSONB | Corporate structure (array) |
| milestones | JSONB | Planning milestones |

**Cascade behavior:** Deleting account_plan deletes ALL children.

#### pursuits
Sales opportunities linked to accounts.

| Column | Type | Notes |
|--------|------|-------|
| pursuit_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Deal name |
| stage | VARCHAR(50) | Sales stage |
| estimated_value | DECIMAL | Deal value |
| probability | INTEGER | Win probability % |
| expected_close_date | DATE | |
| business_unit_id | VARCHAR | References business_units JSONB |

#### stakeholders
Contacts/people at accounts.

| Column | Type | Notes |
|--------|------|-------|
| stakeholder_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Required |
| title | VARCHAR(255) | Job title |
| email | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| division_id | UUID | FK → account_divisions |
| sentiment | VARCHAR(20) | Relationship health |
| influence_level | VARCHAR(20) | 'high', 'medium', 'low' |

#### pursuit_stakeholders (Junction Table)
Links stakeholders to specific pursuits.

| Column | Type | Notes |
|--------|------|-------|
| pursuit_stakeholder_id | UUID | Primary key |
| pursuit_id | UUID | FK → pursuits |
| stakeholder_id | UUID | FK → stakeholders |
| role | VARCHAR(100) | Buyer role |

#### action_items

| Column | Type | Notes |
|--------|------|-------|
| action_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| title | VARCHAR(500) | Required |
| description | TEXT | |
| owner | VARCHAR(255) | Text field |
| due_date | DATE | **This is due_date, not target_date** |
| priority | VARCHAR(50) | 'Critical', 'High', 'Medium', 'Low' |
| status | VARCHAR(50) | See valid values below |
| needs_review | BOOLEAN | AI-imported pending review |
| milestone_period | VARCHAR(10) | 'day_30', 'day_60', 'day_90' |
| bant_dimension | VARCHAR(1) | 'B', 'A', 'N', or 'T' |
| risk_id | UUID | FK → risks |

#### risks

| Column | Type | Notes |
|--------|------|-------|
| risk_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| severity | VARCHAR(20) | **'low', 'medium', 'high', 'critical'** |
| status | VARCHAR(50) | 'open', 'mitigated', 'closed' |
| target_date | DATE | For tracker scheduling |
| needs_review | BOOLEAN | |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### pain_points
**ACTIVE TABLE** - Used for prospect needs and customer issues.

| Column | Type | Notes |
|--------|------|-------|
| pain_point_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| pursuit_id | UUID | FK → pursuits (SET NULL) |
| stakeholder_id | UUID | FK → stakeholders (SET NULL) |
| title | VARCHAR(255) | Required |
| description | TEXT | |
| severity | VARCHAR(20) | **'critical', 'significant', 'moderate', 'minor'** |
| status | VARCHAR(50) | |
| target_date | DATE | For tracker scheduling |
| needs_review | BOOLEAN | |
| deleted_at | TIMESTAMPTZ | Soft delete |

### TAM Tables

#### tam_accounts

| Column | Type | Notes |
|--------|------|-------|
| tam_account_id | UUID | Primary key |
| company_name | VARCHAR(255) | Required |
| website | VARCHAR(255) | |
| vertical | VARCHAR(100) | |
| headquarters | VARCHAR(255) | |
| fit_tier | VARCHAR(10) | 'A', 'B', 'C' |
| priority_score | INTEGER | 0-100 |
| estimated_deal_value | DECIMAL | |
| status | VARCHAR(50) | 'New', 'Qualified', 'Researching', 'Pursuing', 'Promoted' |
| promoted_to_account_plan_id | UUID | When promoted |
| compelling_events | JSONB | |
| buying_signals | JSONB | |
| account_thesis | TEXT | |
| campaign_ids | UUID[] | |

#### account_signals

| Column | Type | Notes |
|--------|------|-------|
| signal_id | UUID | Primary key |
| tam_account_id | UUID | FK → tam_accounts (can be NULL) |
| account_plan_id | UUID | FK → account_plans (can be NULL) |
| signal_type | VARCHAR(100) | |
| title | VARCHAR(255) | |
| signal_date | DATE | |
| source | VARCHAR(255) | URL |
| summary | TEXT | |
| confidence | VARCHAR(20) | 'high', 'medium', 'low' |

### Supporting Tables

#### account_divisions

| Column | Type | Notes |
|--------|------|-------|
| division_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Required |
| description | TEXT | |

#### buckets

| Column | Type | Notes |
|--------|------|-------|
| bucket_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| name | VARCHAR(255) | Required |
| target_date | DATE | |
| status | VARCHAR(50) | 'active', 'completed' |

#### weekly_snapshots

| Column | Type | Notes |
|--------|------|-------|
| snapshot_id | UUID | Primary key |
| account_plan_id | UUID | FK → account_plans (CASCADE) |
| snapshot_week | DATE | Monday of week |
| pipeline_value | NUMERIC | |
| opportunity_count | INTEGER | |
| stakeholder_count | INTEGER | |
| open_risk_count | INTEGER | |
| overdue_action_count | INTEGER | |
| bant_summary | JSONB | |

---

## Business Rules (CURRENT)

### SEVERITY VALUES (CRITICAL - Different by Table)

```
risks table:       'low', 'medium', 'high', 'critical'
pain_points table: 'critical', 'significant', 'moderate', 'minor'
```

**DO NOT MIX THESE.** Using wrong values breaks queries silently.

### Valid Status Values

| Table | Valid Values |
|-------|--------------|
| action_items | 'Not Started', 'In_Progress', 'Completed', 'Cancelled', 'Blocked' |
| risks | 'open', 'mitigated', 'closed' |
| pursuits | 'Discovery', 'Qualification', 'Proposal', 'Negotiation', 'Closed_Won', 'Closed_Lost' |
| tam_accounts | 'New', 'Qualified', 'Researching', 'Pursuing', 'Promoted' |
| buckets | 'active', 'completed' |

### Foreign Key Cascade Behavior

| Parent Deleted | Child Behavior |
|----------------|----------------|
| account_plan | ALL children deleted (CASCADE) |
| pursuit | action_items.pursuit_id → NULL, pursuit_stakeholders deleted |
| stakeholder | pursuit_stakeholders deleted, pain_points.stakeholder_id → NULL |

### Supabase Query Pattern (CRITICAL)

When tables have multiple FKs, specify which one:

```typescript
// ❌ WRONG - causes "ambiguous relationship" error
supabase.from('pain_points').select('*, pursuits(name)')

// ✅ CORRECT - explicit foreign key
supabase.from('pain_points').select('*, pursuits!pursuit_id(name)')
```

### Soft Delete Pattern

```typescript
// Always filter out soft-deleted records
supabase.from('risks').select('*').is('deleted_at', null)
supabase.from('pain_points').select('*').is('deleted_at', null)
```

### Review Queue Filter

Items with `needs_review = true` are HIDDEN from account page views.
**If items "disappear" after AI import, check this flag.**

---

## Workflows (CURRENT)

### Account Plan Creation (7-Step Wizard)

**Location:** `/src/components/wizard/AccountPlanWizard.tsx`

**Steps:**
1. Step1AccountBasics - Company info
2. Step2Research - AI enrichment
3. Step3Stakeholders - Add contacts
4. Step4Opportunities - Create pursuits
5. Step5Competitors - Competitive landscape
6. Step6Strategy - Account strategy
7. Step7Actions - Initial action items

### Notes Import Flow

**Location:** `/src/components/account/ImportMeetingNotes.tsx`

1. User pastes meeting notes
2. AI extracts: action items, risks, pain points, stakeholders
3. Items created with `needs_review = true`
4. User reviews in Review Queue
5. Accept → `needs_review = false` → Shows on account page
6. Reject → `deleted_at = NOW()` → Soft deleted

### Review Queue Pattern

```
AI Import → needs_review = true → Hidden from main views
                    ↓
              Review Queue
                    ↓
Accept → needs_review = false → Visible
Reject → deleted_at = NOW() → Soft deleted
```

---

## AI Context System (CURRENT)

**Location:** `/src/lib/ai/context/builder.ts`

### 4-Layer Context Stack

```
Layer 1: Company Context (company_profile)
Layer 2: Campaign Context (campaigns via campaign_ids)
Layer 3: Account Context (account_plans + related data)
Layer 4: Platform Context (aggregated metrics)
```

### AI Entry Points

| Endpoint | Purpose |
|----------|---------|
| `/api/ai/chat` | Conversational AI |
| `/api/ai/research` | Company research |
| `/api/ai/research-people` | Find stakeholders |
| `/api/ai/parse-notes` | Extract from meeting notes |
| `/api/ai/suggestions` | Proactive suggestions |
| `/api/ai/planning-wizard` | Planning assistance |

---

## Components (CURRENT)

### Active Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AccountPlanWizard | /components/wizard/ | 7-step account creation |
| RollingTracker | /components/account/ | 30/60/90 tracker |
| ActionItemsSection | /components/ | Action items table |
| StakeholderSection | /components/account/ | Stakeholders management |
| PainPointsSection | /components/account/ | Pain points list |
| RisksSection | /components/account/ | Risks table |
| ImportMeetingNotes | /components/account/ | Notes import |

### Before Creating New Components

1. Search first: `find src -name "*ComponentName*"`
2. Check this document
3. Ask if unsure

---

## Common Mistakes (DO NOT DO)

### ❌ Wrong Severity Values
```typescript
// WRONG
await supabase.from('risks').insert({ severity: 'significant' })
await supabase.from('pain_points').insert({ severity: 'high' })

// CORRECT
await supabase.from('risks').insert({ severity: 'critical' })
await supabase.from('pain_points').insert({ severity: 'critical' })
```

### ❌ Ambiguous Foreign Key Queries
```typescript
// WRONG
.select('*, pursuits(*)')

// CORRECT
.select('*, pursuits!pursuit_id(*)')
```

### ❌ Forgetting Soft Delete Filter
```typescript
// Always add for tables with deleted_at
.is('deleted_at', null)
```

### ❌ Creating Duplicate Components
Search first before creating anything new.

---

## Environment Variables

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

**Optional:**
```
HUBSPOT_ACCESS_TOKEN=
HUBSPOT_PORTAL_ID=
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# PLANNED CHANGES - Do NOT implement unless explicitly asked
# ═══════════════════════════════════════════════════════════════════════════════

The following changes are PLANNED but NOT YET IMPLEMENTED.

## Planned: TAM Account Enrichment

**New fields to add to tam_accounts:**
- `operating_regions` TEXT[]
- `products_overview` TEXT
- `regulatory_exposure` TEXT[]
- `enrichment_status` VARCHAR
- `enriched_at` TIMESTAMPTZ

**Status:** NOT IMPLEMENTED

## Planned: Intelligence Polarity Split

**Problem:** `pain_points` table used for both prospect opportunities AND customer complaints.

**Planned:** Split into:
- `customer_needs` - Prospect pain points (POSITIVE - sales opportunities)
- `platform_issues` - Customer complaints (NEGATIVE - problems to fix)

**Status:** NOT IMPLEMENTED. Continue using `pain_points` table.

## Planned: BANT Stakeholder Mapping

**New fields for pursuit_stakeholders:**
- `buyer_personas` JSONB
- `deal_sentiment` VARCHAR
- `bant_impact` JSONB
- `influence_level` VARCHAR

**Status:** NOT IMPLEMENTED

## Planned: Action Items Changes

- Rename `due_date` → `target_date`
- Add `stakeholder_id` FK
- Remove `milestone_period`

**Status:** NOT IMPLEMENTED. Continue using `due_date`.

## Planned: Division Unification

Migrate `account_plans.business_units` JSONB → `account_divisions` table.

**Status:** NOT IMPLEMENTED. Both systems still in use.

---

## Implementation Order (When Ready)

1. **TAM Enrichment** - Add fields, build API (isolated, low risk)
2. **Intelligence Polarity** - Create tables, migrate data
3. **BANT Stakeholder Mapping** - Add fields
4. **Action Items** - Rename field, add to tracker
5. **Division Unification** - Migrate data

---

*Last updated: 2026-01-05*
