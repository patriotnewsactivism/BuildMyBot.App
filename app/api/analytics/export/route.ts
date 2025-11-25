import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/analytics/export
 *
 * Export leads as CSV
 */
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (user instanceof NextResponse) return user;

  try {
    const supabase = createServerSupabaseClient();

    // Get all leads for user
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        bot:bots(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to export leads' },
        { status: 500 }
      );
    }

    // Convert to CSV
    const csv = convertToCSV(leads || []);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="buildmybot-leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export leads' },
      { status: 500 }
    );
  }
}

/**
 * Convert leads to CSV format
 */
function convertToCSV(leads: any[]): string {
  const headers = [
    'Email',
    'Phone',
    'Score',
    'Status',
    'Bot Name',
    'Source URL',
    'First Contact',
    'Last Contact',
    'Conversation Count',
  ];

  const rows = leads.map(lead => [
    lead.email || '',
    lead.phone || '',
    lead.score || 0,
    lead.status || '',
    lead.bot?.name || '',
    lead.source_url || '',
    new Date(lead.created_at).toLocaleDateString(),
    new Date(lead.last_contact || lead.created_at).toLocaleDateString(),
    lead.conversation_count || 1,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
