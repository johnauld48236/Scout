import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface ParsedTamAccount {
  company_name: string
  website: string | null
  vertical: string  // From sheet name
  fit_tier: string | null
  estimated_deal_value: number | null
  company_summary: string | null
  import_source: string
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

    const accounts: ParsedTamAccount[] = []
    const sheetSummary: Record<string, number> = {}

    // Process each sheet - sheet name becomes the vertical/campaign
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]

      // First, get raw data as array of arrays to find the real header row
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

      if (rawData.length < 2) continue

      // Find the header row - look for a row with multiple non-empty cells that look like headers
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] as unknown[]
        if (!row) continue

        // Count non-empty cells
        const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length

        // Check if this looks like a header row (multiple cells, contains "company" or "name" etc.)
        const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
        const looksLikeHeaders = rowStr.includes('company') ||
                                  rowStr.includes('account') ||
                                  rowStr.includes('name') ||
                                  rowStr.includes('website') ||
                                  rowStr.includes('industry')

        if (nonEmptyCells >= 3 && looksLikeHeaders) {
          headerRowIndex = i
          break
        }
      }

      // Now parse with the correct header row
      const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as Array<Record<string, unknown>>

      if (data.length === 0) continue

      // Get column headers to find company name column
      const headers = Object.keys(data[0] || {})

      // Try to find company name column (flexible matching)
      // Priority order: company_name, company name, account_name, account, then fallback to any 'name'
      const companyCol = headers.find(h => {
        const lower = h.toLowerCase().replace(/_/g, ' ')
        return lower === 'company name' || lower === 'company'
      }) || headers.find(h => {
        const lower = h.toLowerCase().replace(/_/g, ' ')
        return lower === 'account name' || lower === 'account'
      }) || headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('company') || lower.includes('account')
      }) || headers.find(h => {
        const lower = h.toLowerCase()
        return lower === 'name' || lower === 'organization'
      })

      if (!companyCol) {
        // Skip sheets without a company column
        console.log(`TAM Import: Skipping sheet "${sheetName}" - no company column found. Headers:`, headers.slice(0, 5))
        continue
      }

      console.log(`TAM Import: Processing sheet "${sheetName}" using column "${companyCol}"`)


      // Find other useful columns
      const websiteCol = headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('website') || lower.includes('domain') || lower.includes('url')
      })

      const valueCol = headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('value') || lower.includes('revenue') || lower.includes('size') || lower.includes('amount')
      })

      const tierCol = headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('tier') || lower.includes('priority') || lower.includes('grade')
      })

      const summaryCol = headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('summary') || lower.includes('description') || lower.includes('notes')
      })

      let sheetCount = 0

      for (const row of data) {
        const companyName = row[companyCol] as string
        if (!companyName || typeof companyName !== 'string' || companyName.trim() === '') continue

        // Clean company name
        const cleanName = companyName.trim()

        // Skip obvious header rows or invalid entries
        if (cleanName.toLowerCase() === 'company' ||
            cleanName.toLowerCase() === 'company name' ||
            cleanName.toLowerCase() === 'account' ||
            cleanName.length < 2) continue

        // Extract website
        let website: string | null = null
        if (websiteCol && row[websiteCol]) {
          const rawWebsite = String(row[websiteCol]).trim()
          if (rawWebsite && rawWebsite.includes('.')) {
            website = rawWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')
          }
        }

        // Extract value
        let estimatedValue: number | null = null
        if (valueCol && row[valueCol]) {
          const rawValue = row[valueCol]
          if (typeof rawValue === 'number') {
            estimatedValue = rawValue
          } else if (typeof rawValue === 'string') {
            const parsed = parseFloat(rawValue.replace(/[^0-9.]/g, ''))
            if (!isNaN(parsed)) estimatedValue = parsed
          }
        }

        // Extract tier
        let fitTier: string | null = null
        if (tierCol && row[tierCol]) {
          const rawTier = String(row[tierCol]).trim().toUpperCase()
          if (['A', 'B', 'C'].includes(rawTier)) {
            fitTier = rawTier
          } else if (rawTier.includes('HIGH') || rawTier.includes('1')) {
            fitTier = 'A'
          } else if (rawTier.includes('MED') || rawTier.includes('2')) {
            fitTier = 'B'
          } else if (rawTier.includes('LOW') || rawTier.includes('3')) {
            fitTier = 'C'
          }
        }

        // Extract summary
        let summary: string | null = null
        if (summaryCol && row[summaryCol]) {
          summary = String(row[summaryCol]).trim() || null
        }

        accounts.push({
          company_name: cleanName,
          website,
          vertical: sheetName, // Sheet name becomes the vertical/campaign
          fit_tier: fitTier,
          estimated_deal_value: estimatedValue,
          company_summary: summary,
          import_source: 'excel',
        })

        sheetCount++
      }

      if (sheetCount > 0) {
        sheetSummary[sheetName] = sheetCount
      }
    }

    // Deduplicate by company name (keep first occurrence)
    const seen = new Set<string>()
    const uniqueAccounts = accounts.filter(a => {
      const key = a.company_name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Collect debug info about each sheet
    const sheetDebug: Record<string, { headers: string[]; rowCount: number; companyCol: string | null; headerRow: number }> = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

      // Find header row
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i] as unknown[]
        if (!row) continue
        const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length
        const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ')
        const looksLikeHeaders = rowStr.includes('company') || rowStr.includes('account') ||
                                  rowStr.includes('name') || rowStr.includes('website') || rowStr.includes('industry')
        if (nonEmptyCells >= 3 && looksLikeHeaders) {
          headerRowIndex = i
          break
        }
      }

      const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex }) as Array<Record<string, unknown>>
      const headers = data.length > 0 ? Object.keys(data[0]) : []

      const companyCol = headers.find(h => {
        const lower = h.toLowerCase().replace(/_/g, ' ')
        return lower === 'company name' || lower === 'company'
      }) || headers.find(h => {
        const lower = h.toLowerCase().replace(/_/g, ' ')
        return lower === 'account name' || lower === 'account'
      }) || headers.find(h => {
        const lower = h.toLowerCase()
        return lower.includes('company') || lower.includes('account')
      }) || null

      sheetDebug[sheetName] = {
        headers: headers.slice(0, 10),
        rowCount: data.length,
        companyCol,
        headerRow: headerRowIndex + 1
      }
    }

    return NextResponse.json({
      success: true,
      accounts: uniqueAccounts,
      summary: {
        totalAccounts: uniqueAccounts.length,
        sheetsProcessed: Object.keys(sheetSummary).length,
        byVertical: sheetSummary,
        duplicatesRemoved: accounts.length - uniqueAccounts.length,
      },
      debug: {
        sheetNames: workbook.SheetNames,
        sheetDetails: sheetDebug,
      },
    })
  } catch (error) {
    console.error('TAM Excel parse error:', error)
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 })
  }
}
