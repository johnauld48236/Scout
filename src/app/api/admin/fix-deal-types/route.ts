import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()

  try {
    // Get all pursuits with null pursuit_type
    const { data: pursuits, error: fetchError } = await supabase
      .from('pursuits')
      .select('pursuit_id, name, pursuit_type')
      .is('pursuit_type', null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pursuits || pursuits.length === 0) {
      return NextResponse.json({ message: 'No pursuits need fixing', updated: 0 })
    }

    const results = {
      renewal: 0,
      upsell: 0,
      new_business: 0,
      errors: [] as string[],
    }

    // Infer deal type from name
    for (const pursuit of pursuits) {
      const nameLower = pursuit.name.toLowerCase()
      let dealType = 'new_business'

      if (nameLower.includes('renewal') || nameLower.includes('recurring')) {
        dealType = 'renewal'
      } else if (nameLower.includes('upsell') || nameLower.includes('expansion')) {
        dealType = 'upsell'
      }

      const { error: updateError } = await supabase
        .from('pursuits')
        .update({ pursuit_type: dealType })
        .eq('pursuit_id', pursuit.pursuit_id)

      if (updateError) {
        results.errors.push(`Failed to update ${pursuit.name}: ${updateError.message}`)
      } else {
        results[dealType as keyof typeof results]++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${pursuits.length} pursuits`,
      results: {
        renewal: results.renewal,
        upsell: results.upsell,
        new_business: results.new_business,
        errors: results.errors.length,
      },
    })
  } catch (error) {
    console.error('Fix deal types error:', error)
    return NextResponse.json({ error: 'Failed to fix deal types' }, { status: 500 })
  }
}
