import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/tam/[id]/contacts - Import contacts to TAM account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Handle bulk insert
    if (body.contacts && Array.isArray(body.contacts)) {
      const insertData = body.contacts.map((c: Record<string, unknown>) => ({
        tam_account_id: id,
        full_name: c.full_name || 'Unknown',
        title: c.title || null,
        email: c.email || null,
        phone: c.phone || null,
        linkedin_url: c.linkedin_url || null,
        hubspot_contact_id: c.hubspot_contact_id || null,
        source: c.source || 'hubspot',
        notes: c.notes || null,
      }))

      const { data: inserted, error } = await supabase
        .from('tam_contacts')
        .insert(insertData)
        .select()

      if (error) {
        console.error('Error bulk creating TAM contacts:', error)
        return Response.json({ error: `Failed to create contacts: ${error.message}` }, { status: 500 })
      }

      return Response.json({ success: true, contacts: inserted, count: inserted?.length || 0 })
    }

    // Handle single insert
    const {
      full_name,
      title,
      email,
      phone,
      linkedin_url,
      hubspot_contact_id,
      source,
      notes,
    } = body

    if (!full_name) {
      return Response.json({ error: 'full_name is required' }, { status: 400 })
    }

    const { data: contact, error } = await supabase
      .from('tam_contacts')
      .insert({
        tam_account_id: id,
        full_name,
        title,
        email,
        phone,
        linkedin_url,
        hubspot_contact_id,
        source: source || 'manual',
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating TAM contact:', error)
      return Response.json({ error: `Failed to create contact: ${error.message}` }, { status: 500 })
    }

    return Response.json({ success: true, contact })
  } catch (error) {
    console.error('TAM Contacts API error:', error)
    return Response.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}

// GET /api/tam/[id]/contacts - Get contacts for TAM account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: contacts, error } = await supabase
      .from('tam_contacts')
      .select('*')
      .eq('tam_account_id', id)
      .order('full_name')

    if (error) {
      console.error('Error fetching TAM contacts:', error)
      return Response.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    return Response.json({ success: true, contacts: contacts || [] })
  } catch (error) {
    console.error('TAM Contacts API error:', error)
    return Response.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}
