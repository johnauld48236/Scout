# Account Plan Architecture

Comprehensive documentation of the Account Plan system in Scout.

## Table of Contents
1. [Data Model](#1-data-model)
2. [Account Plan Creation Flow](#2-account-plan-creation-flow)
3. [Account Plan Update Flow](#3-account-plan-update-flow)
4. [AI Context Integration](#4-ai-context-integration)
5. [UI Component Inventory](#5-ui-component-inventory)
6. [API Route Inventory](#6-api-route-inventory)

---

## 1. Data Model

### Core Table: `account_plans`

**Location:** `supabase/fresh-setup.sql:180-211`

```sql
account_plans (
  account_plan_id UUID PRIMARY KEY,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'Prospect',
  website, industry, vertical, employee_count, headquarters,
  description, strategic_objectives, risk_factors, account_strategy,
  research_summary TEXT,
  research_findings JSONB,
  competitors JSONB,

  -- Linkage
  tam_account_id UUID → tam_accounts,
  campaign_id UUID → campaigns,

  -- Planning fields
  business_units JSONB DEFAULT '[]',
  signal_mappings JSONB DEFAULT '{}',
  milestones JSONB DEFAULT '{"day_30": [], "day_60": [], "day_90": []}',
  plan_status VARCHAR(20) DEFAULT 'draft',
  plan_completeness INTEGER DEFAULT 0,
  planning_period_start DATE,
  planning_period_end DATE,
  activated_at TIMESTAMP,

  -- Intelligence (add-compelling-events.sql)
  compelling_events JSONB DEFAULT '[]',
  buying_signals JSONB DEFAULT '[]',
  account_thesis TEXT,
  campaign_ids UUID[] DEFAULT '{}',

  -- Structure (account-structure.sql)
  corporate_structure JSONB DEFAULT '{}',
  enrichment_status TEXT DEFAULT 'not_started',
  last_enriched_at TIMESTAMPTZ,
  enrichment_source TEXT,

  -- Intelligence (account-intelligence-schema.sql)
  messaging_playbook JSONB,
  review_cycle JSONB,
  account_tier VARCHAR(20),
  account_source TEXT,
  account_owner TEXT,

  created_at, updated_at TIMESTAMPTZ
)
```

### Entity Relationship Diagram (ASCII)

```
                              ┌─────────────────┐
                              │   campaigns     │
                              │ (campaign_id)   │
                              └────────┬────────┘
                                       │ 1:N
    ┌──────────────────┐               │
    │   tam_accounts   │◄──────────────┼───────────────────┐
    │ (tam_account_id) │               │                   │
    └────────┬─────────┘               │                   │
             │                         │                   │
             │ 1:1 (promoted)          │                   │
             ▼                         ▼                   │
    ┌────────────────────────────────────────────┐         │
    │              account_plans                  │         │
    │           (account_plan_id)                 │◄────────┘
    └──────────────────┬─────────────────────────┘  campaign_ids[]
                       │
       ┌───────────────┼───────────────┬────────────────┬─────────────────┐
       │               │               │                │                 │
       ▼               ▼               ▼                ▼                 ▼
┌─────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────────┐
│ stakeholders│ │   pursuits  │ │action_items│ │  pain_points │ │     risks     │
│(stakeholder │ │ (pursuit_id)│ │(action_id) │ │(pain_point_id│ │  (risk_id)    │
│     _id)    │ │             │ │            │ │              │ │               │
└──────┬──────┘ └──────┬──────┘ └────────────┘ └──────────────┘ └───────────────┘
       │               │
       │               │
       ▼               ▼
┌──────────────────────────────┐
│    pursuit_stakeholders      │  (M:N junction)
│   (pursuit_id, stakeholder_id│
└──────────────────────────────┘

Additional Related Tables:
- engagement_logs → account_plans (1:N)
- engagement_attendees → engagement_logs, stakeholders (junction)
- buckets → account_plans (1:N)
- bucket_items → buckets (1:N)
- account_divisions → account_plans (1:N)
- research_findings → account_plans (1:N)
- bant_analyses → pursuits (1:N)
- qualification_criteria → pursuits (1:N)
- stakeholder_relationships → stakeholders (self-referential M:N)
- verbatims → account_plans (1:N)
- import_batches → account_plans (1:N)
```

### Foreign Key Cascade Behaviors

| Parent Table | Child Table | ON DELETE |
|-------------|-------------|-----------|
| account_plans | stakeholders | CASCADE |
| account_plans | pursuits | CASCADE |
| account_plans | action_items | CASCADE |
| account_plans | pain_points | CASCADE |
| account_plans | risks | CASCADE |
| account_plans | engagement_logs | CASCADE |
| account_plans | buckets | CASCADE |
| account_plans | account_divisions | CASCADE |
| account_plans | research_findings | CASCADE |
| pursuits | action_items | SET NULL |
| pursuits | pursuit_stakeholders | CASCADE |
| pursuits | pain_points | SET NULL |
| pursuits | risks | SET NULL |
| stakeholders | pursuit_stakeholders | CASCADE |
| stakeholders | engagement_attendees | CASCADE |
| stakeholders | pain_points | SET NULL |

### Severity Value Differences

**IMPORTANT:** Different tables use different severity scales:

| Table | Valid Severity Values |
|-------|----------------------|
| `risks` | 'low', 'medium', 'high', 'critical' |
| `pain_points` | 'critical', 'significant', 'moderate', 'minor' |

---

## 2. Account Plan Creation Flow

### Entry Points

1. **Direct Creation:** `NewAccountButton` → `/accounts/new`
2. **TAM Promotion:** `PromoteToAccountPlanButton` → `/accounts/new?tam_account_id=...`

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] Button Click                                                            │
│      ├── NewAccountButton (/src/components/NewAccountButton.tsx:10)          │
│      │   └── router.push('/accounts/new')                                    │
│      │                                                                       │
│      └── PromoteToAccountPlanButton (/src/components/PromoteToAccount...tsx) │
│          └── router.push('/accounts/new?tam_account_id=...&company_name=...')│
│                                                                              │
│  [2] Page Load                                                               │
│      └── /accounts/new/page.tsx                                              │
│          ├── Parses query params (tam_account_id, company_name, etc.)        │
│          └── Renders AccountPlanWizard with initialData                      │
│                                                                              │
│  [3] Wizard Steps (AccountPlanWizard.tsx)                                    │
│      ├── Step 1: Account Basics (company info)                               │
│      ├── Step 2: Research (AI-powered company research)                      │
│      ├── Step 3: Stakeholders (key contacts)                                 │
│      ├── Step 4: Opportunities (pursuits)                                    │
│      ├── Step 5: Competitors                                                 │
│      ├── Step 6: Strategy                                                    │
│      └── Step 7: Actions → saveAccountPlan()                                 │
│                                                                              │
│  [4] API Call                                                                │
│      └── POST /api/accounts/wizard                                           │
│          └── Creates: account_plans, stakeholders, pursuits,                 │
│              action_items, updates competitors JSONB                         │
│                                                                              │
│  [5] Redirect                                                                │
│      └── router.push(`/accounts/${accountPlanId}`)                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Wizard API Route Details

**File:** `/src/app/api/accounts/wizard/route.ts`

**Creates (in order):**
1. `account_plans` record (lines 27-53)
2. Updates `tam_accounts` status if promoted (lines 63-72)
3. Imports `tam_contacts` as stakeholders (lines 75-93)
4. Creates wizard `stakeholders` (lines 97-121)
5. Creates `pursuits` (lines 124-142)
6. Creates `action_items` (lines 145-165)
7. Updates `account_plans.competitors` JSONB (lines 169-187)

### Validations

| Field | Validation | Location |
|-------|-----------|----------|
| `accountName` | Required | wizard/route.ts implicit |
| `researchFindings` | Max 20, truncated content | wizard/route.ts:14-24 |
| All text fields | Length truncated | wizard/route.ts:29-38 |

---

## 3. Account Plan Update Flow

### Update Entry Points

1. **Account Detail Page:** Direct field editing via inline editors
2. **Planning Page:** Multi-step plan builder at `/accounts/[id]/plan`
3. **Individual Section APIs:** Dedicated routes for each child entity

### What Can Be Changed

**Via PATCH `/api/accounts/[id]`:**
```typescript
// Allowed fields (route.ts:49-70):
'sales_rep', 'technical_am', 'account_name', 'industry', 'vertical',
'account_type', 'employee_count', 'headquarters', 'website',
'account_strategy', 'corporate_structure', 'enrichment_status',
'last_enriched_at', 'enrichment_source', 'account_thesis',
'campaign_ids', 'compelling_events', 'buying_signals'
```

**What's Locked:**
- `account_plan_id` (primary key)
- `tam_account_id` (linkage established at creation)
- `created_at` (immutable)

### Cascade Updates

| When You Update | What Else Changes |
|-----------------|-------------------|
| Delete `account_plan` | All child records deleted (CASCADE) |
| Delete `pursuit` | `action_items.pursuit_id` → NULL, `pursuit_stakeholders` deleted |
| Delete `stakeholder` | `pursuit_stakeholders` deleted, `pain_points.stakeholder_id` → NULL |
| Update `plan_status` | `activated_at` set when status = 'active' |

### Planning Page Flow

**File:** `/src/app/accounts/[id]/plan/page.tsx`

Uses `PlanningContainer` with 5 steps:
1. OrgSignalMapping - Map research to business units
2. StakeholderMapping - Map stakeholders to units
3. OpportunityBuilder - Create/edit pursuits
4. MilestonesActions - 30/60/90 day planning
5. PlanReview - Final review & activate

---

## 4. AI Context Integration

### Context Builder

**File:** `/src/lib/ai/context/builder.ts`

```
buildAIContext(navigation) → AIContext
  ├── fetchEntityContext() → account_plan data + related pursuits/stakeholders
  ├── fetchPlatformContext() → goals, pipeline stats, alerts, active campaigns
  └── fetchCompanyContext() → company_profile data (what we sell)
```

### Data Flow into AI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI CONTEXT LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                                                        │
│  │ Company Context  │  company_profile table                                 │
│  │ (What we sell)   │  - value_proposition, key_differentiators              │
│  └────────┬─────────┘  - target_verticals, competitors                       │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │Campaign Context  │  campaigns table (via campaign_ids)                    │
│  │(Current focus)   │  - campaign_context, value_proposition                 │
│  └────────┬─────────┘  - key_pain_points, signal_triggers                    │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │ Account Context  │  account_plans + related data                          │
│  │(Specific target) │  - account_thesis, research_findings                   │
│  └────────┬─────────┘  - stakeholders, pursuits, pain_points                 │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐                                                        │
│  │Platform Context  │  Aggregated metrics                                    │
│  │(Overall state)   │  - goals progress, pipeline stats                      │
│  └──────────────────┘  - overdue actions, stalled pursuits                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AI Entry Points

| Endpoint | Purpose | Account Data Used |
|----------|---------|-------------------|
| `/api/ai/chat` | Conversational AI | Full AIContext |
| `/api/ai/research` | Company research | account_name, website, campaign_context |
| `/api/ai/research-people` | Find stakeholders | account_name, website |
| `/api/ai/parse-notes` | Extract from meeting notes | existing stakeholders |
| `/api/ai/suggestions` | Proactive suggestions | Full AIContext |
| `/api/ai/contextual-research` | Quick research | account_name + custom prompts |
| `/api/ai/enrich-structure` | Corporate structure | account_name, website |
| `/api/ai/planning-wizard` | Planning assistance | Full account + pursuits |

### Navigation → Entity Mapping

**File:** `/src/lib/ai/context/builder.ts:526-609`

```typescript
parseNavigationFromPath('/accounts/abc123') → {
  page: 'accounts',
  entityType: 'account_plan',
  entityId: 'abc123'
}
```

This triggers `fetchEntityContext()` which loads:
- Full `account_plans` record
- Related `pursuits` (id, name, stage, value, probability)
- Related `stakeholders` (id, name, role_type, sentiment)

---

## 5. UI Component Inventory

### `/src/components/account/` (38 files)

| Component | Status | Purpose |
|-----------|--------|---------|
| `AccountHeaderToggles.tsx` | Active | Favorite/review toggle buttons |
| `AccountOverviewCard.tsx` | Active | Summary card on listing |
| `AccountOwnerEditor.tsx` | Active | Inline owner assignment |
| `AccountPageClient.tsx` | Active | Client-side page wrapper |
| `ActionCheckbox.tsx` | Active | Action item toggle |
| `AddActionButton.tsx` | Active | Add action modal trigger |
| `AvailableContactsPicker.tsx` | Active | Contact selection from TAM |
| `CampaignSelector.tsx` | Active | Campaign assignment dropdown |
| `CompetitiveLandscape.tsx` | Active | Competitor display |
| `DivisionsCard.tsx` | Active | Corporate structure card |
| `FinancialHealthIndicator.tsx` | Active | Financial signal badges |
| `ImportMeetingNotes.tsx` | Active | Meeting notes import wizard |
| `ImportNotesButton.tsx` | Active | Import trigger button |
| `IntelligenceCard.tsx` | Active | Thesis/signals card |
| `MilestoneCheckbox.tsx` | Active | Milestone toggle |
| `MultiDealSelector.tsx` | Active | Multi-pursuit selection |
| `OpportunitiesCard.tsx` | Active | Pursuits list card |
| `OpportunityCardWrapper.tsx` | Active | Single pursuit card |
| `OpportunityQuickEdit.tsx` | Active | Inline pursuit editor |
| `OrgChartCard.tsx` | Active | Org chart visualization |
| `PainPointsSection.tsx` | **In /components/** | Pain points list |
| `PlanningWizard.tsx` | Potentially Orphaned | Old planning wizard? |
| `PlanStatusCard.tsx` | Active | Plan status display |
| `QuickAIResearchButton.tsx` | Active | AI research trigger |
| `RecentlyDeleted.tsx` | Active | Soft-delete recovery |
| `ResearchInsightsPanel.tsx` | Active | Research findings display |
| `ReviewNotesSection.tsx` | Active | Weekly review notes |
| `ReviewQueue.tsx` | Active | Import triage queue |
| `RiskCard.tsx` | Active | Single risk display |
| `RisksSection.tsx` | Active | Risks list |
| `RollingTracker.tsx` | Active | 30/60/90 day tracker |
| `SignalsSection.tsx` | Active | Account signals list |
| `StakeholderQuickEdit.tsx` | Active | Inline stakeholder editor |
| `StakeholderSection.tsx` | Active | Stakeholders card |
| `StrategySection.tsx` | Active | Strategy display |
| `TrackerItem.tsx` | Active | Individual tracker row |
| `UpdateSignalsButton.tsx` | Active | AI signal refresh |

### `/src/components/wizard/` (6 items)

| Component | Status | Purpose |
|-----------|--------|---------|
| `AccountPlanWizard.tsx` | Active | Main wizard container |
| `WizardProgress.tsx` | Active | Step indicator |
| `types.ts` | Active | TypeScript interfaces |
| `steps/Step1AccountBasics.tsx` | Active | Company info step |
| `steps/Step2Research.tsx` | Active | AI research step |
| `steps/Step3Stakeholders.tsx` | Active | Stakeholder entry |
| `steps/Step4Opportunities.tsx` | Active | Pursuit creation |
| `steps/Step5Competitors.tsx` | Active | Competitor mapping |
| `steps/Step6Strategy.tsx` | Active | Strategy definition |
| `steps/Step7Actions.tsx` | Active | Action items & submit |

### `/src/components/planning/` (8 files)

| Component | Status | Purpose |
|-----------|--------|---------|
| `PlanningContainer.tsx` | Active | Main planning orchestrator |
| `PlanningProgress.tsx` | Active | Step progress indicator |
| `OrgSignalMapping.tsx` | Active | Research → BU mapping |
| `StakeholderMapping.tsx` | Active | Stakeholder → BU assignment |
| `OpportunityBuilder.tsx` | Active | Pursuit creation/editing |
| `EngagementStrategy.tsx` | Active | Engagement sequencing |
| `MilestonesActions.tsx` | Active | 30/60/90 day planning |
| `PlanReview.tsx` | Active | Final review & activation |

### Shared State

Components that share state through props or server data:

```
account page.tsx (server)
  └── Fetches all data, passes to child components
      ├── RollingTracker ← painPoints, risks, milestones, pursuits, buckets
      ├── RisksSection ← risks, buckets, pursuits, actions
      ├── PainPointsSection ← painPoints, stakeholders, pursuits, engagements
      ├── OpportunitiesCard ← pursuits, stakeholders, actionItems, bantByPursuit
      └── StakeholderSection ← stakeholders, divisions
```

---

## 6. API Route Inventory

### `/api/accounts/`

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/accounts` | GET, POST | List all accounts, create new |
| `/api/accounts/wizard` | POST | Create account via wizard |

### `/api/accounts/[id]/`

| Route | Methods | Purpose |
|-------|---------|---------|
| `route.ts` | GET, PATCH, DELETE | Single account CRUD |
| `/actions` | GET, POST | List/create action items |
| `/available-contacts` | GET | TAM contacts for import |
| `/buckets` | GET, POST | Custom buckets/goals |
| `/buckets/[bucketId]` | PATCH, DELETE | Single bucket ops |
| `/buckets/[bucketId]/items` | POST, DELETE | Bucket item assignment |
| `/buckets/[bucketId]/pursuits` | POST, DELETE | Bucket-pursuit linking |
| `/deleted` | GET | Recently deleted items |
| `/divisions` | GET, POST | Account divisions |
| `/divisions/[divisionId]` | PATCH, DELETE | Single division ops |
| `/engagements` | GET, POST | Engagement logs |
| `/favorite` | POST | Toggle favorite |
| `/intelligence` | GET, PATCH | Account intelligence data |
| `/pain-points` | GET, POST | Pain points |
| `/pain-points/[painPointId]` | PATCH, DELETE | Single pain point ops |
| `/pain-points/[painPointId]/pursuits` | POST, DELETE | Pain-pursuit linking |
| `/plan` | GET, PUT | Plan status & data |
| `/plan/activate` | POST | Activate plan |
| `/review-notes` | GET, POST | Weekly review notes |
| `/review-queue` | GET | Items needing review |
| `/review-queue/accept` | POST | Accept reviewed items |
| `/review-queue/reclassify` | POST | Reclassify items |
| `/review-queue/reject` | POST | Reject items |
| `/risks` | GET, POST | Risks |
| `/risks/[riskId]` | PATCH, DELETE | Single risk ops |
| `/risks/[riskId]/pursuits` | POST, DELETE | Risk-pursuit linking |
| `/signals` | GET, POST | Account signals |
| `/stakeholders` | GET, POST | Stakeholders |
| `/weekly-review` | POST | Toggle weekly review |

### Potentially Duplicative Routes

| Route 1 | Route 2 | Notes |
|---------|---------|-------|
| `/api/accounts` POST | `/api/accounts/wizard` POST | Different purposes: simple create vs full wizard |

### Usage Notes

1. **Supabase Joins:** When querying tables with multiple FK relationships, specify the FK explicitly:
   ```typescript
   // Wrong - ambiguous
   supabase.from('pain_points').select('*, pursuits(name)')

   // Correct - explicit FK
   supabase.from('pain_points').select('*, pursuits!pursuit_id(name)')
   ```

2. **Review Queue Filter:** Account page filters out `needs_review=true` items:
   ```typescript
   const painPoints = rawPainPoints.filter(p => !p.needs_review)
   ```

3. **Soft Delete:** Some tables use `deleted_at` for soft delete:
   ```typescript
   supabase.from('risks').select('*').is('deleted_at', null)
   ```

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-05 | Initial documentation created |
