import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SignalInput {
  signal_type: string
  title?: string
  summary: string
  source?: string
  confidence?: 'high' | 'medium' | 'low'
  category?: string
  stakeholder_id?: string
  pursuit_id?: string
  sentiment_score?: number
  is_financial?: boolean
}

interface SignalsRequestBody {
  findings: SignalInput[]
  research_summary?: string
}

// POST /api/accounts/[id]/signals - Add new signals from AI research
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body: SignalsRequestBody = await request.json()

    if (!body.findings || !Array.isArray(body.findings)) {
      return Response.json({ error: 'findings array is required' }, { status: 400 })
    }

    // Get the account plan to find the tam_account_id (if linked)
    const { data: account, error: accountError } = await supabase
      .from('account_plans')
      .select('account_plan_id, tam_account_id, research_findings')
      .eq('account_plan_id', id)
      .single()

    if (accountError || !account) {
      return Response.json({ error: 'Account not found' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Build signal inserts with different levels of column support
    const buildSignalInserts = (level: 'full' | 'with_account' | 'minimal') => body.findings.map(signal => {
      // Minimal - only original schema columns
      const minimal = {
        tam_account_id: account.tam_account_id || null,
        signal_type: signal.signal_type,
        summary: signal.summary,
        source: signal.source || 'AI Research',
        signal_date: now.split('T')[0],
        created_at: now,
      }

      if (level === 'minimal') return minimal

      // With account_plan_id
      const withAccount = {
        ...minimal,
        account_plan_id: id,
      }

      if (level === 'with_account') return withAccount

      // Full - all enhanced columns
      return {
        ...withAccount,
        title: signal.title || null,
        confidence: signal.confidence || 'medium',
        category: signal.category || null,
        stakeholder_id: signal.stakeholder_id || null,
        pursuit_id: signal.pursuit_id || null,
        sentiment_score: signal.sentiment_score ?? null,
        is_financial: signal.is_financial || false,
      }
    })

    // Try with full columns first, then progressively fall back
    let result = await supabase
      .from('account_signals')
      .insert(buildSignalInserts('full'))
      .select()

    // If error, try with just account_plan_id
    if (result.error?.message?.includes('column') || result.error?.code === '42703') {
      console.log('Full columns not available, trying with account_plan_id')
      result = await supabase
        .from('account_signals')
        .insert(buildSignalInserts('with_account'))
        .select()
    }

    // If still error, fall back to minimal
    if (result.error?.message?.includes('column') || result.error?.code === '42703') {
      console.log('account_plan_id not available, falling back to minimal')
      result = await supabase
        .from('account_signals')
        .insert(buildSignalInserts('minimal'))
        .select()
    }

    const { data: insertedSignals, error: signalsError } = result

    if (signalsError) {
      console.error('Error inserting signals:', signalsError)
      return Response.json({
        error: `Failed to save signals: ${signalsError.message}`,
        details: signalsError
      }, { status: 500 })
    }

    // Also update the research_findings on the account_plan for reference
    const existingFindings = account.research_findings || []
    const newFindings = body.findings.map(f => ({
      id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: f.signal_type,
      content: f.summary,
      source: f.source,
      confidence: f.confidence,
      added_at: now,
    }))

    const { error: updateError } = await supabase
      .from('account_plans')
      .update({
        research_findings: [...existingFindings, ...newFindings],
        updated_at: now,
      })
      .eq('account_plan_id', id)

    if (updateError) {
      console.error('Error updating account plan:', updateError)
      // Don't fail the request if this secondary update fails
    }

    return Response.json({
      success: true,
      signals: insertedSignals,
      count: insertedSignals?.length || 0,
    })
  } catch (error) {
    console.error('Signals API error:', error)
    return Response.json({ error: 'Failed to save signals' }, { status: 500 })
  }
}

// GET /api/accounts/[id]/signals - Get signals for an account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // First get the account to find tam_account_id
    const { data: account } = await supabase
      .from('account_plans')
      .select('tam_account_id')
      .eq('account_plan_id', id)
      .single()

    // Build query to get signals for either tam_account_id or account_plan_id
    let query = supabase
      .from('account_signals')
      .select('*')
      .order('signal_date', { ascending: false })

    if (account?.tam_account_id) {
      query = query.or(`tam_account_id.eq.${account.tam_account_id},account_plan_id.eq.${id}`)
    } else {
      query = query.eq('account_plan_id', id)
    }

    const { data: signals, error } = await query

    if (error) {
      console.error('Error fetching signals:', error)
      return Response.json({ error: 'Failed to fetch signals' }, { status: 500 })
    }

    return Response.json({
      success: true,
      signals: signals || [],
    })
  } catch (error) {
    console.error('Signals API error:', error)
    return Response.json({ error: 'Failed to fetch signals' }, { status: 500 })
  }
}
