// app/api/sparks/[id]/link/route.ts
// Spark linking API - handles both linking (enrichment) and converting (net new)
// Note: [id] param is theme_id (scout_themes primary key)

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface LinkRequest {
  pursuitId: string | null;
  action: 'link' | 'convert' | 'unlink';
}

// POST: Link, convert, or unlink a Spark
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: themeId } = await params;
    const supabase = await createClient();
    const { pursuitId, action }: LinkRequest = await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'link':
        // ENRICHMENT: Link to existing deal
        if (!pursuitId) {
          return NextResponse.json(
            { error: 'pursuitId required for link action' },
            { status: 400 }
          );
        }
        updates.linked_pursuit_id = pursuitId;
        updates.converted_to_pursuit_id = null; // Clear conversion if re-linking
        updates.status = 'linked';
        break;

      case 'convert':
        // NET NEW: Convert to new deal
        if (!pursuitId) {
          return NextResponse.json(
            { error: 'pursuitId required for convert action' },
            { status: 400 }
          );
        }
        updates.converted_to_pursuit_id = pursuitId;
        updates.linked_pursuit_id = null; // Clear link when converting
        updates.status = 'converted';
        break;

      case 'unlink':
        // Remove all connections
        updates.linked_pursuit_id = null;
        updates.converted_to_pursuit_id = null;
        updates.status = 'exploring';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "link", "convert", or "unlink"' },
          { status: 400 }
        );
    }

    const { data, error } = await supabase
      .from('scout_themes')
      .update(updates)
      .eq('theme_id', themeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error linking spark:', error);
    return NextResponse.json({ error: 'Failed to update spark' }, { status: 500 });
  }
}

// GET: Get current link status
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: themeId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('scout_themes')
      .select(
        `
        theme_id,
        title,
        status,
        linked_pursuit_id,
        converted_to_pursuit_id,
        linked_pursuit:pursuits!linked_pursuit_id(pursuit_id, name, estimated_value, stage),
        converted_pursuit:pursuits!converted_to_pursuit_id(pursuit_id, name, estimated_value, stage)
      `
      )
      .eq('theme_id', themeId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      themeId: data.theme_id,
      title: data.title,
      status: data.status,
      linkedPursuitId: data.linked_pursuit_id,
      convertedPursuitId: data.converted_to_pursuit_id,
      linkedPursuit: data.linked_pursuit,
      convertedPursuit: data.converted_pursuit,
    });
  } catch (error) {
    console.error('Error fetching spark link status:', error);
    return NextResponse.json({ error: 'Failed to fetch spark' }, { status: 500 });
  }
}
