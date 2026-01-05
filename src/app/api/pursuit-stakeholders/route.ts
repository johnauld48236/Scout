import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/pursuit-stakeholders?pursuit_id=xxx - Get stakeholders for a pursuit
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const pursuitId = searchParams.get('pursuit_id')

    if (!pursuitId) {
      return Response.json({ error: 'pursuit_id is required' }, { status: 400 })
    }

    const { data: links, error } = await supabase
      .from('pursuit_stakeholders')
      .select(`
        *,
        stakeholders(stakeholder_id, full_name, title, email, role_type)
      `)
      .eq('pursuit_id', pursuitId)

    if (error) {
      console.error('Error fetching pursuit stakeholders:', error)
      return Response.json({ error: 'Failed to fetch stakeholders' }, { status: 500 })
    }

    return Response.json({ stakeholders: links || [] })
  } catch (error) {
    console.error('Pursuit stakeholders API error:', error)
    return Response.json({ error: 'Failed to fetch stakeholders' }, { status: 500 })
  }
}

// POST /api/pursuit-stakeholders - Link stakeholder to pursuit
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { pursuit_id, stakeholder_id, role } = body

    if (!pursuit_id || !stakeholder_id) {
      return Response.json({ error: 'pursuit_id and stakeholder_id are required' }, { status: 400 })
    }

    const { data: link, error } = await supabase
      .from('pursuit_stakeholders')
      .upsert({
        pursuit_id,
        stakeholder_id,
        role,
      })
      .select()
      .single()

    if (error) {
      console.error('Error linking stakeholder:', error)
      return Response.json({ error: 'Failed to link stakeholder' }, { status: 500 })
    }

    return Response.json({ link })
  } catch (error) {
    console.error('Pursuit stakeholders API error:', error)
    return Response.json({ error: 'Failed to link stakeholder' }, { status: 500 })
  }
}

// DELETE /api/pursuit-stakeholders - Unlink stakeholder from pursuit
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { pursuit_id, stakeholder_id } = body

    if (!pursuit_id || !stakeholder_id) {
      return Response.json({ error: 'pursuit_id and stakeholder_id are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('pursuit_stakeholders')
      .delete()
      .eq('pursuit_id', pursuit_id)
      .eq('stakeholder_id', stakeholder_id)

    if (error) {
      console.error('Error unlinking stakeholder:', error)
      return Response.json({ error: 'Failed to unlink stakeholder' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Pursuit stakeholders API error:', error)
    return Response.json({ error: 'Failed to unlink stakeholder' }, { status: 500 })
  }
}
