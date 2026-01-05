# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Scout is a sales execution platform built with Next.js 16, React 19, Supabase, and Tailwind CSS 4. It helps sales teams manage accounts, campaigns, pursuits, and stakeholders with AI-powered research and insights.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

No test runner is currently configured.

## Architecture

### Stack
- **Frontend**: Next.js 16 App Router with React Server Components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Styling**: Tailwind CSS 4 with CSS custom properties

### Key Directories

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes (REST endpoints)
│   │   ├── accounts/[id]/ # Account-specific APIs (pain-points, risks, stakeholders, etc.)
│   │   ├── ai/            # AI endpoints (research, chat, parse-notes, etc.)
│   │   └── integrations/  # HubSpot integration
│   ├── accounts/          # Account pages (list, detail, plan wizard)
│   ├── campaigns/         # Campaign management
│   ├── tam/               # Total Addressable Market views
│   └── goals/             # Sales goals tracking
├── components/
│   ├── account/           # Account detail page components
│   ├── ai/                # AI chat drawer, research modal
│   ├── planning/          # Account plan builder components
│   ├── wizard/            # Account plan wizard steps
│   └── integrations/      # HubSpot components
├── lib/
│   ├── supabase/          # Supabase client (server.ts, client.ts)
│   ├── ai/                # AI service layer and context builder
│   └── hubspot/           # HubSpot API client
supabase/                   # SQL schema files (37 migration files)
```

### Data Model

Core entities in order of hierarchy:
- **company_profile**: Single-row config for the selling company
- **campaigns**: Vertical or thematic sales initiatives
- **tam_accounts**: Total Addressable Market accounts (prospects)
- **account_plans**: Active accounts being worked
- **pursuits**: Opportunities/deals within accounts
- **stakeholders**: People at customer accounts
- **pain_points**, **risks**, **action_items**: Account intelligence

### Supabase Patterns

Server-side queries use `createClient()` from `@/lib/supabase/server`:
```typescript
const supabase = await createClient()
const { data, error } = await supabase.from('table').select('*')
```

When joining tables with multiple foreign keys, specify the relationship explicitly:
```typescript
// Avoid: ambiguous relationship error
supabase.from('pain_points').select('*, pursuits(name)')

// Correct: specify foreign key
supabase.from('pain_points').select('*, pursuits!pursuit_id(name)')
```

### AI Integration

AI features use the Anthropic SDK directly in API routes:
- `/api/ai/research` - Web search + AI synthesis for account research
- `/api/ai/parse-notes` - Extract structured data from meeting notes
- `/api/ai/chat` - Conversational AI with account context
- `AIService` in `lib/ai/service.ts` provides the facade

Research context is built from navigation state via `buildAIContext()`.

### Design System

Uses "Scout" theme with CSS custom properties (see `globals.css`):
- `--scout-saddle`, `--scout-earth`, `--scout-sky`, `--scout-trail`, etc.
- Components use inline styles with CSS variables for theming
- Font: Bitter for headers, Inter for body text

### API Conventions

- API routes return `{ data }` on success, `{ error: string }` on failure
- Use `Response.json()` for responses
- Account-scoped APIs nest under `/api/accounts/[id]/`
- Severity values differ by table:
  - `risks`: 'low', 'medium', 'high', 'critical'
  - `pain_points`: 'critical', 'significant', 'moderate', 'minor'

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

Optional for HubSpot integration:
```
HUBSPOT_ACCESS_TOKEN=
HUBSPOT_PORTAL_ID=
```
