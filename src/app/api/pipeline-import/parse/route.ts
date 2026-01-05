import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface ParsedDeal {
  deal_name: string
  company_name: string
  stage: string
  estimated_value: number | null
  weighted_value: number | null  // Column P - Weighted Conservative
  recurring_value: number | null
  deal_owner: string | null
  target_quarter: string | null
  deal_type: string | null
  vertical: string | null
  region: string | null
  note: string | null
  close_date: string | null
  probability: number | null
}

interface AccountAssignment {
  account_name: string
  sales_manager: string | null
  account_manager: string | null
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

    // Parse Pipeline sheet
    const pipelineSheet = workbook.Sheets['Pipeline']
    if (!pipelineSheet) {
      return NextResponse.json({ error: 'Pipeline sheet not found' }, { status: 400 })
    }

    const pipelineData = XLSX.utils.sheet_to_json(pipelineSheet) as Array<Record<string, unknown>>

    // Parse Account Assignments sheet (if exists)
    const assignmentsSheet = workbook.Sheets['Account Assignments']
    const accountAssignments: AccountAssignment[] = []

    if (assignmentsSheet) {
      const assignmentsData = XLSX.utils.sheet_to_json(assignmentsSheet) as Array<Record<string, unknown>>
      assignmentsData.forEach(row => {
        const accountName = row['Commercial Accounts'] as string
        if (accountName) {
          accountAssignments.push({
            account_name: accountName,
            sales_manager: (row['Sales Manager'] as string) || null,
            account_manager: (row['Account Manager'] as string) || null,
          })
        }
      })
    }

    // Map stage names from spreadsheet to database stages
    // Spreadsheet stages: win, purchasing engaged, interested, no indication (high/low), discovery, qualification, proposal, negotiation
    const mapStage = (stage: string | unknown): string => {
      if (!stage || typeof stage !== 'string') return 'Discovery'
      const s = stage.toLowerCase().trim()
      // Closed stages
      if (s === 'win' || s === 'closed won' || s === 'closed_won') return 'Closed_Won'
      if (s === 'lost' || s === 'closed lost' || s === 'closed_lost') return 'Closed_Lost'
      // Late stages (high probability)
      if (s.includes('purchasing') || s.includes('engaged')) return 'Negotiation'
      if (s.includes('negotiation') || s.includes('negotiat')) return 'Negotiation'
      if (s.includes('proposal')) return 'Proposal'
      // Mid stages
      if (s.includes('qualification') || s.includes('qualif')) return 'Qualification'
      if (s.includes('interested')) return 'Qualification'
      // Early stages (low probability)
      if (s.includes('discovery')) return 'Discovery'
      if (s.includes('no indication')) return 'Discovery'
      return 'Discovery'
    }

    // Extract company name from deal name (pattern: "CompanyName: Deal Description")
    const extractCompanyName = (dealName: string): string => {
      if (!dealName) return 'Unknown'
      const colonIndex = dealName.indexOf(':')
      if (colonIndex > 0) {
        return dealName.substring(0, colonIndex).trim()
      }
      return dealName.split(' ')[0] || 'Unknown'
    }

    // Parse deals from pipeline
    const deals: ParsedDeal[] = []

    for (const row of pipelineData) {
      const dealName = row['Deal Name'] as string
      if (!dealName || dealName.trim() === '') continue

      const stage = mapStage(row['Deal Stage'])
      const totalAmount = row['Total Amount'] as number || null
      const recurringAmount = row['Recurring Amount'] as number || null
      const quarter = row['Quarter to Close'] as string || null

      // Column P: Weighted Amount Conservative (note: spreadsheet has trailing space)
      const weightedValue = (
        row['Weighted Amount Conservative '] ??  // with trailing space (actual)
        row['Weighted Amount Conservative'] ??   // without trailing space
        row['Weighted Amount Conseervative'] ??  // typo variant
        row['Weighted Conservative'] ??
        null
      ) as number | null

      // Column J: Conservative Probability (driven by Deal Stage)
      const probability = (
        row['Conservative Probability'] ??
        row['Probability'] ??
        null
      ) as number | null

      // Determine close date for won deals
      let closeDate: string | null = null
      if (stage === 'Closed_Won' && quarter) {
        // Parse quarter like "Q1'26" to a date
        const match = quarter.match(/Q(\d)'(\d{2})/)
        if (match) {
          const q = parseInt(match[1])
          const year = 2000 + parseInt(match[2])
          const month = (q - 1) * 3 + 1 // Q1 = Jan, Q2 = Apr, etc.
          closeDate = `${year}-${month.toString().padStart(2, '0')}-01`
        }
      }

      deals.push({
        deal_name: dealName.trim(),
        company_name: extractCompanyName(dealName),
        stage,
        estimated_value: totalAmount,
        weighted_value: weightedValue,
        recurring_value: recurringAmount,
        deal_owner: (row['Deal Owner'] as string) || null,
        target_quarter: quarter,
        deal_type: (row['Deal Type'] as string) || null,
        vertical: (row['Vertical'] as string) || null,
        region: (row['Region'] as string) || null,
        note: (row['Note'] as string) || null,
        close_date: closeDate,
        probability: probability,
      })
    }

    // Get column headers from the spreadsheet for debugging
    const columnHeaders = pipelineData.length > 0 ? Object.keys(pipelineData[0]) : []

    return NextResponse.json({
      success: true,
      deals,
      accountAssignments,
      summary: {
        totalDeals: deals.length,
        closedWon: deals.filter(d => d.stage === 'Closed_Won').length,
        closedLost: deals.filter(d => d.stage === 'Closed_Lost').length,
        active: deals.filter(d => !d.stage.startsWith('Closed')).length,
        accountAssignments: accountAssignments.length,
        // Pipeline totals
        totalPipeline: deals.filter(d => !d.stage.startsWith('Closed')).reduce((sum, d) => sum + (d.estimated_value || 0), 0),
        totalWeightedValue: deals.filter(d => !d.stage.startsWith('Closed')).reduce((sum, d) => sum + (d.weighted_value || 0), 0),
        // Weighted by deal type (Renewal/Recurring, Upsell, New Business/PoC/Pilot)
        renewalWeighted: deals.filter(d => {
          const dt = d.deal_type?.toLowerCase().trim()
          return dt === 'renewal' || dt === 'recurring'
        }).reduce((sum, d) => sum + (d.weighted_value || 0), 0),
        upsellWeighted: deals.filter(d => {
          const dt = d.deal_type?.toLowerCase().trim()
          return dt === 'upsell' || dt === 'expansion'
        }).reduce((sum, d) => sum + (d.weighted_value || 0), 0),
        newBusinessWeighted: deals.filter(d => {
          const dt = d.deal_type?.toLowerCase().trim()
          return dt === 'new business' || dt === 'poc' || dt === 'pilot' || !dt
        }).reduce((sum, d) => sum + (d.weighted_value || 0), 0),
      },
      debug: {
        columnHeaders,
        sampleRow: pipelineData[0] || null,
      },
    })
  } catch (error) {
    console.error('Excel parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 })
  }
}
