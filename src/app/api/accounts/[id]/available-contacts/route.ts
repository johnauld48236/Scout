import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get available contacts for an account plan (from TAM and prospect_contacts)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    // Get the account plan to find its name
    const { data: accountPlan, error: accountError } = await supabase
      .from('account_plans')
      .select('account_name, tam_account_id')
      .eq('account_plan_id', id)
      .single()

    if (accountError || !accountPlan) {
      return NextResponse.json({ error: 'Account plan not found' }, { status: 404 })
    }

    // Get existing stakeholders to filter them out
    const { data: existingStakeholders } = await supabase
      .from('stakeholders')
      .select('email, full_name')
      .eq('account_plan_id', id)

    const stakeholderEmails = new Set<string>()
    const stakeholderNames = new Set<string>()
    existingStakeholders?.forEach(s => {
      if (s.email) stakeholderEmails.add(s.email.toLowerCase().trim())
      if (s.full_name) stakeholderNames.add(s.full_name.toLowerCase().trim())
    })

    // Find TAM accounts that match this account name
    const { data: tamAccounts } = await supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name')
      .ilike('company_name', `%${accountPlan.account_name}%`)

    // Collect TAM account IDs - include the directly linked one if exists
    const tamAccountIds = new Set<string>()
    if (accountPlan.tam_account_id) {
      tamAccountIds.add(accountPlan.tam_account_id)
    }
    tamAccounts?.forEach(t => tamAccountIds.add(t.tam_account_id))

    // Build OR conditions for finding contacts
    const conditions = []
    if (tamAccountIds.size > 0) {
      conditions.push(`tam_account_id.in.(${Array.from(tamAccountIds).join(',')})`)
    }
    conditions.push(`company_name.ilike.%${accountPlan.account_name}%`)

    // Use or filter to find matching contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('prospect_contacts')
      .select('*')
      .or(conditions.join(','))
      .order('is_hot', { ascending: false })
      .order('last_name')
      .limit(100) // Limit to avoid huge responses

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Filter out contacts that are already stakeholders
    const availableContacts = (contacts || []).filter(contact => {
      const contactEmail = contact.email?.toLowerCase().trim()
      const contactName = `${contact.first_name} ${contact.last_name}`.toLowerCase().trim()

      if (contactEmail && stakeholderEmails.has(contactEmail)) return false
      if (contactName && stakeholderNames.has(contactName)) return false
      return true
    })

    return NextResponse.json({
      contacts: availableContacts,
      accountName: accountPlan.account_name,
      totalAvailable: availableContacts.length,
      alreadyStakeholders: (contacts?.length || 0) - availableContacts.length,
    })
  } catch (error) {
    console.error('Available contacts error:', error)
    return NextResponse.json({ error: 'Failed to fetch available contacts' }, { status: 500 })
  }
}

// POST - Promote a contact to stakeholder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { contact_id } = body

    if (!contact_id) {
      return NextResponse.json({ error: 'contact_id is required' }, { status: 400 })
    }

    // Get the contact
    const { data: contact, error: contactError } = await supabase
      .from('prospect_contacts')
      .select('*')
      .eq('contact_id', contact_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if already a stakeholder (by email or name)
    const fullName = `${contact.first_name} ${contact.last_name}`.trim()

    const { data: existingByEmail } = contact.email ? await supabase
      .from('stakeholders')
      .select('stakeholder_id')
      .eq('account_plan_id', id)
      .ilike('email', contact.email)
      .single() : { data: null }

    const { data: existingByName } = await supabase
      .from('stakeholders')
      .select('stakeholder_id')
      .eq('account_plan_id', id)
      .ilike('full_name', fullName)
      .single()

    if (existingByEmail || existingByName) {
      return NextResponse.json({ error: 'Contact is already a stakeholder' }, { status: 400 })
    }

    // Create stakeholder from contact
    const { data: newStakeholder, error: createError } = await supabase
      .from('stakeholders')
      .insert({
        account_plan_id: id,
        full_name: fullName,
        title: contact.job_title,
        email: contact.email,
        linkedin_url: contact.linkedin_url,
        notes: contact.is_hot ? 'Hot lead from imported contacts' : 'Imported contact',
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating stakeholder:', createError)
      return NextResponse.json({ error: 'Failed to create stakeholder' }, { status: 500 })
    }

    // Update the contact to link it to this account plan (mark as used)
    await supabase
      .from('prospect_contacts')
      .update({ account_plan_id: id })
      .eq('contact_id', contact_id)

    return NextResponse.json({
      success: true,
      stakeholder: newStakeholder,
      message: `${fullName} added as stakeholder`,
    })
  } catch (error) {
    console.error('Promote contact error:', error)
    return NextResponse.json({ error: 'Failed to promote contact' }, { status: 500 })
  }
}
