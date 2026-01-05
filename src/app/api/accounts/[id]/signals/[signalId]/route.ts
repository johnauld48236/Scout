import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// DELETE /api/accounts/[id]/signals/[signalId] - Delete a signal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signalId: string }> }
) {
  try {
    const { id, signalId } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('account_signals')
      .delete()
      .eq('signal_id', signalId)

    if (error) {
      console.error('Error deleting signal:', error)
      return Response.json({ error: 'Failed to delete signal' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete signal error:', error)
    return Response.json({ error: 'Failed to delete signal' }, { status: 500 })
  }
}
