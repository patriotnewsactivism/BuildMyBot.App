import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/calendar';

/**
 * GET /api/appointments/slots
 *
 * Get available appointment slots
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const eventTypeId = url.searchParams.get('eventTypeId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!eventTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(
      parseInt(eventTypeId),
      startDate,
      endDate
    );

    return NextResponse.json({ slots });

  } catch (error: any) {
    console.error('Slots API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}
