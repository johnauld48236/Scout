import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ImportContact {
  company_name: string
  first_name: string
  last_name: string
  email: string
  email_domain: string
  job_title: string
  is_hot: boolean
  attended_conference: boolean
  attended_webinar: boolean
  lifecycle_stage: string | null
  source: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { contacts, options } = body as {
      contacts: ImportContact[]
      options?: {
        skipDuplicates?: boolean
        linkToAccounts?: boolean
      }
    }

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: 'contacts array is required' }, { status: 400 })
    }

    const results = {
      created: 0,
      skipped: 0,
      skippedAsStakeholder: 0,
      linkedToTam: 0,
      linkedToAccountPlan: 0,
      tamAccountsCreated: 0,
      errors: [] as string[],
    }

    // Get existing TAM accounts for matching
    const { data: tamAccounts } = await supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name')

    // Get existing account plans for matching
    const { data: accountPlans } = await supabase
      .from('account_plans')
      .select('account_plan_id, account_name')

    // Get existing stakeholders to avoid duplicates
    const { data: existingStakeholders } = await supabase
      .from('stakeholders')
      .select('email, full_name')

    // Create lookup maps (lowercase for case-insensitive matching)
    const tamByName = new Map<string, string>()
    const accountPlanByName = new Map<string, string>()
    const stakeholderEmails = new Set<string>()
    const stakeholderNames = new Set<string>()

    tamAccounts?.forEach(tam => {
      tamByName.set(tam.company_name.toLowerCase().trim(), tam.tam_account_id)
    })

    accountPlans?.forEach(ap => {
      accountPlanByName.set(ap.account_name.toLowerCase().trim(), ap.account_plan_id)
    })

    // Build stakeholder lookup sets
    existingStakeholders?.forEach(s => {
      if (s.email) stakeholderEmails.add(s.email.toLowerCase().trim())
      if (s.full_name) stakeholderNames.add(s.full_name.toLowerCase().trim())
    })

    // Check for existing contacts by email to avoid duplicates
    const existingEmails = new Set<string>()
    if (options?.skipDuplicates !== false) {
      const { data: existingContacts } = await supabase
        .from('prospect_contacts')
        .select('email')

      existingContacts?.forEach(c => {
        if (c.email) existingEmails.add(c.email.toLowerCase())
      })
    }

    // First pass: identify companies that need new TAM accounts
    const companiesNeedingTam = new Map<string, string>() // lowercase -> original casing
    for (const contact of contacts) {
      if (!contact.company_name) continue
      const companyLower = contact.company_name.toLowerCase().trim()

      // Skip if TAM account exists or we already noted this company
      if (tamByName.has(companyLower) || companiesNeedingTam.has(companyLower)) {
        continue
      }

      // Store with original casing for display
      companiesNeedingTam.set(companyLower, contact.company_name)
    }

    // Create new TAM accounts for unmatched companies
    if (companiesNeedingTam.size > 0) {
      const newTamAccounts = Array.from(companiesNeedingTam.values()).map(companyName => ({
        company_name: companyName,
        status: 'Prospecting',
        fit_tier: 'C', // Unqualified - needs review
        fit_rationale: 'Auto-created from imported leads',
      }))

      // Insert in batches
      const tamBatchSize = 50
      for (let i = 0; i < newTamAccounts.length; i += tamBatchSize) {
        const batch = newTamAccounts.slice(i, i + tamBatchSize)
        const { data: created, error: createError } = await supabase
          .from('tam_accounts')
          .insert(batch)
          .select('tam_account_id, company_name')

        if (createError) {
          console.error('Error creating TAM accounts:', createError)
        } else if (created) {
          results.tamAccountsCreated += created.length
          // Add to lookup map for use when creating contacts
          created.forEach(tam => {
            tamByName.set(tam.company_name.toLowerCase().trim(), tam.tam_account_id)
          })
        }
      }
    }

    // Process contacts in batches
    const batchSize = 50
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize)
      const contactsToInsert = []

      for (const contact of batch) {
        // Skip if already exists as a stakeholder (by email or name)
        const contactEmail = contact.email?.toLowerCase().trim()
        const contactFullName = `${contact.first_name} ${contact.last_name}`.toLowerCase().trim()

        if (contactEmail && stakeholderEmails.has(contactEmail)) {
          results.skippedAsStakeholder++
          continue
        }
        if (contactFullName && stakeholderNames.has(contactFullName)) {
          results.skippedAsStakeholder++
          continue
        }

        // Skip if email already exists in prospect_contacts
        if (contact.email && existingEmails.has(contact.email.toLowerCase())) {
          results.skipped++
          continue
        }

        // Try to find matching TAM account or account plan
        const companyLower = contact.company_name.toLowerCase().trim()
        const tamAccountId = tamByName.get(companyLower) || null
        const accountPlanId = accountPlanByName.get(companyLower) || null

        if (tamAccountId) results.linkedToTam++
        if (accountPlanId) results.linkedToAccountPlan++

        contactsToInsert.push({
          company_name: contact.company_name,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email || null,
          email_domain: contact.email_domain || null,
          job_title: contact.job_title || null,
          is_hot: contact.is_hot,
          attended_conference: contact.attended_conference,
          attended_webinar: contact.attended_webinar,
          lifecycle_stage: contact.lifecycle_stage,
          source: contact.source || 'medical_leads',
          tam_account_id: tamAccountId,
          account_plan_id: accountPlanId,
        })

        // Add to existing emails set to avoid duplicates within this import
        if (contact.email) {
          existingEmails.add(contact.email.toLowerCase())
        }
      }

      if (contactsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('prospect_contacts')
          .insert(contactsToInsert)

        if (insertError) {
          results.errors.push(`Batch ${Math.floor(i / batchSize) + 1} error: ${insertError.message}`)
        } else {
          results.created += contactsToInsert.length
        }
      }
    }

    const skippedMsg = results.skipped > 0 ? `, skipped ${results.skipped} duplicates` : ''
    const stakeholderMsg = results.skippedAsStakeholder > 0 ? `, skipped ${results.skippedAsStakeholder} existing stakeholders` : ''
    const tamMsg = results.tamAccountsCreated > 0 ? ` Created ${results.tamAccountsCreated} new TAM accounts.` : ''

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      message: `Created ${results.created} contacts${skippedMsg}${stakeholderMsg}.${tamMsg} Linked ${results.linkedToTam} to TAM accounts, ${results.linkedToAccountPlan} to account plans.`,
    })
  } catch (error) {
    console.error('Medical import error:', error)
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 })
  }
}

// PATCH - Re-link existing contacts to TAM accounts (and create new TAM accounts for unmatched companies)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  try {
    // Get all TAM accounts
    const { data: tamAccounts } = await supabase
      .from('tam_accounts')
      .select('tam_account_id, company_name')

    // Get all account plans
    const { data: accountPlans } = await supabase
      .from('account_plans')
      .select('account_plan_id, account_name')

    // Build lookup maps
    const tamByName = new Map<string, string>()
    const accountPlanByName = new Map<string, string>()

    tamAccounts?.forEach(tam => {
      tamByName.set(tam.company_name.toLowerCase().trim(), tam.tam_account_id)
    })

    accountPlans?.forEach(ap => {
      accountPlanByName.set(ap.account_name.toLowerCase().trim(), ap.account_plan_id)
    })

    // Get all contacts that need linking (fetch all with pagination)
    let allContacts: { contact_id: string; company_name: string; tam_account_id: string | null; account_plan_id: string | null }[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data: batch, error: fetchError } = await supabase
        .from('prospect_contacts')
        .select('contact_id, company_name, tam_account_id, account_plan_id')
        .range(offset, offset + pageSize - 1)

      if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 })
      }

      if (!batch || batch.length === 0) break
      allContacts = allContacts.concat(batch)
      if (batch.length < pageSize) break
      offset += pageSize
    }

    const contacts = allContacts

    const results = {
      totalContacts: contacts.length,
      linkedToTam: 0,
      linkedToAccountPlan: 0,
      alreadyLinked: 0,
      tamAccountsCreated: 0,
    }

    // First pass: identify companies that need new TAM accounts
    const companiesNeedingTam = new Map<string, string>() // lowercase -> original casing
    for (const contact of contacts || []) {
      if (!contact.company_name) continue
      const companyLower = contact.company_name.toLowerCase().trim()

      // Skip if already has TAM account or we already know about this company
      if (contact.tam_account_id || tamByName.has(companyLower) || companiesNeedingTam.has(companyLower)) {
        continue
      }

      // Store with original casing for display
      companiesNeedingTam.set(companyLower, contact.company_name)
    }

    // Create new TAM accounts for unmatched companies
    if (companiesNeedingTam.size > 0) {
      const newTamAccounts = Array.from(companiesNeedingTam.values()).map(companyName => ({
        company_name: companyName,
        status: 'Prospecting',
        fit_tier: 'C', // Unqualified - needs review
        fit_rationale: 'Auto-created from imported leads',
      }))

      // Insert in batches
      const batchSize = 50
      for (let i = 0; i < newTamAccounts.length; i += batchSize) {
        const batch = newTamAccounts.slice(i, i + batchSize)
        const { data: created, error: createError } = await supabase
          .from('tam_accounts')
          .insert(batch)
          .select('tam_account_id, company_name')

        if (createError) {
          console.error('Error creating TAM accounts:', createError)
        } else if (created) {
          results.tamAccountsCreated += created.length
          // Add to lookup map
          created.forEach(tam => {
            tamByName.set(tam.company_name.toLowerCase().trim(), tam.tam_account_id)
          })
        }
      }
    }

    // Second pass: link all contacts to their TAM accounts
    for (const contact of contacts || []) {
      const companyLower = contact.company_name?.toLowerCase().trim()
      if (!companyLower) continue

      const tamAccountId = tamByName.get(companyLower)
      const accountPlanId = accountPlanByName.get(companyLower)

      // Check if already fully linked
      if (contact.tam_account_id && contact.account_plan_id) {
        results.alreadyLinked++
        continue
      }

      // Update if we found new links
      const updates: { tam_account_id?: string; account_plan_id?: string } = {}
      if (tamAccountId && !contact.tam_account_id) {
        updates.tam_account_id = tamAccountId
        results.linkedToTam++
      }
      if (accountPlanId && !contact.account_plan_id) {
        updates.account_plan_id = accountPlanId
        results.linkedToAccountPlan++
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('prospect_contacts')
          .update(updates)
          .eq('contact_id', contact.contact_id)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.totalContacts} contacts. Created ${results.tamAccountsCreated} new TAM accounts. Linked ${results.linkedToTam} to TAM, ${results.linkedToAccountPlan} to account plans. ${results.alreadyLinked} already linked.`,
    })
  } catch (error) {
    console.error('Re-link error:', error)
    return NextResponse.json({ error: 'Failed to re-link contacts' }, { status: 500 })
  }
}

// GET - List existing prospect contacts or get stats
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const accountPlanId = searchParams.get('account_plan_id')
  const tamAccountId = searchParams.get('tam_account_id')
  const isHot = searchParams.get('is_hot')
  const statsOnly = searchParams.get('stats') === 'true'

  try {
    // For stats mode, fetch all contacts with pagination and return counts
    if (statsOnly) {
      let allContacts: { tam_account_id: string | null; company_name: string }[] = []
      let offset = 0
      const pageSize = 1000

      while (true) {
        const { data: batch, error } = await supabase
          .from('prospect_contacts')
          .select('tam_account_id, company_name')
          .range(offset, offset + pageSize - 1)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!batch || batch.length === 0) break
        allContacts = allContacts.concat(batch)
        if (batch.length < pageSize) break
        offset += pageSize
      }

      const linkedToTam = allContacts.filter(c => c.tam_account_id).length
      const uniqueCompanies = new Set(allContacts.map(c => c.company_name)).size

      return NextResponse.json({
        stats: {
          total: allContacts.length,
          linkedToTam,
          uniqueCompanies,
        }
      })
    }

    // Regular query with filters
    let query = supabase
      .from('prospect_contacts')
      .select('*')
      .order('is_hot', { ascending: false })
      .order('company_name')

    if (accountPlanId) {
      query = query.eq('account_plan_id', accountPlanId)
    }
    if (tamAccountId) {
      query = query.eq('tam_account_id', tamAccountId)
    }
    if (isHot === 'true') {
      query = query.eq('is_hot', true)
    }

    const { data: contacts, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}
