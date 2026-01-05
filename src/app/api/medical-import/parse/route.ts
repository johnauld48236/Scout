import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface ParsedContact {
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
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Find the right sheet - try common names
    const sheetNames = workbook.SheetNames
    let targetSheet = workbook.Sheets[sheetNames[0]] // Default to first sheet

    // Look for specific sheet names
    const preferredNames = ['Use this Tab - Merged', 'Merged', 'Contacts', 'Medical Leads']
    for (const name of preferredNames) {
      if (workbook.Sheets[name]) {
        targetSheet = workbook.Sheets[name]
        break
      }
    }

    const data = XLSX.utils.sheet_to_json(targetSheet) as Array<Record<string, unknown>>

    const contacts: ParsedContact[] = []

    for (const row of data) {
      // Try different possible column names for each field
      const companyName = (row['Company Name'] || row['Company'] || row['Account Name'] || '') as string
      const firstName = (row['First Name'] || row['FirstName'] || '') as string
      const lastName = (row['Last Name'] || row['LastName'] || '') as string
      const email = (row['Email'] || row['Email Address'] || '') as string
      const jobTitle = (row['Job Title'] || row['Title'] || row['Job_Title'] || '') as string

      // Skip rows without essential data
      if (!companyName || (!firstName && !lastName)) continue

      // Extract email domain
      let emailDomain = ''
      if (email && email.includes('@')) {
        emailDomain = email.split('@')[1]?.toLowerCase() || ''
      }

      // Check for hot lead indicators
      const isHotRaw = row['is_hot'] || row['Is Hot'] || row['Hot'] || row['HOT'] || ''
      const isHot = isHotRaw === true ||
        String(isHotRaw).toLowerCase() === 'true' ||
        String(isHotRaw).toLowerCase() === 'yes' ||
        String(isHotRaw) === '1'

      // Check for event attendance
      const attendedConferenceRaw = row['Attended Conference'] || row['Conference'] || ''
      const attendedConference = attendedConferenceRaw === true ||
        String(attendedConferenceRaw).toLowerCase() === 'true' ||
        String(attendedConferenceRaw).toLowerCase() === 'yes' ||
        String(attendedConferenceRaw) === '1'

      const attendedWebinarRaw = row['Attended Webinar'] || row['Webinar'] || ''
      const attendedWebinar = attendedWebinarRaw === true ||
        String(attendedWebinarRaw).toLowerCase() === 'true' ||
        String(attendedWebinarRaw).toLowerCase() === 'yes' ||
        String(attendedWebinarRaw) === '1'

      const lifecycleStage = (row['Lifecycle Stage'] || row['Stage'] || null) as string | null

      contacts.push({
        company_name: companyName.trim(),
        first_name: String(firstName).trim(),
        last_name: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        email_domain: emailDomain,
        job_title: String(jobTitle).trim(),
        is_hot: isHot,
        attended_conference: attendedConference,
        attended_webinar: attendedWebinar,
        lifecycle_stage: lifecycleStage,
        source: 'medical_leads',
      })
    }

    // Get unique companies for summary
    const uniqueCompanies = new Set(contacts.map(c => c.company_name.toLowerCase()))
    const hotContacts = contacts.filter(c => c.is_hot).length

    return NextResponse.json({
      success: true,
      contacts,
      summary: {
        totalContacts: contacts.length,
        uniqueCompanies: uniqueCompanies.size,
        hotContacts,
        conferenceAttendees: contacts.filter(c => c.attended_conference).length,
        webinarAttendees: contacts.filter(c => c.attended_webinar).length,
      },
    })
  } catch (error) {
    console.error('Medical leads parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 })
  }
}
