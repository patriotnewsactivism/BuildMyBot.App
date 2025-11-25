/**
 * Calendar/Appointment Scheduling Integration
 * Supports Cal.com and custom booking system
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_API_URL = 'https://api.cal.com/v1';

export interface AppointmentSlot {
  id: string;
  start: string;
  end: string;
  available: boolean;
}

export interface BookingDetails {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  start: string;
  end: string;
  eventTypeId: number;
}

/**
 * Get available time slots from Cal.com
 */
export async function getAvailableSlots(
  eventTypeId: number,
  startDate: string,
  endDate: string
): Promise<AppointmentSlot[]> {
  if (!CAL_COM_API_KEY) {
    throw new Error('Cal.com API key not configured');
  }

  try {
    const response = await fetch(
      `${CAL_COM_API_URL}/slots?eventTypeId=${eventTypeId}&startTime=${startDate}&endTime=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${CAL_COM_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch available slots');
    }

    const data = await response.json();
    return data.slots || [];
  } catch (error) {
    console.error('Cal.com API error:', error);
    throw error;
  }
}

/**
 * Create a booking in Cal.com
 */
export async function createBooking(details: BookingDetails) {
  if (!CAL_COM_API_KEY) {
    throw new Error('Cal.com API key not configured');
  }

  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CAL_COM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventTypeId: details.eventTypeId,
        start: details.start,
        end: details.end,
        responses: {
          name: details.name,
          email: details.email,
          phone: details.phone || '',
          notes: details.notes || '',
        },
        metadata: {},
        timeZone: 'America/New_York', // Default timezone
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create booking');
    }

    return await response.json();
  } catch (error) {
    console.error('Cal.com booking error:', error);
    throw error;
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, reason?: string) {
  if (!CAL_COM_API_KEY) {
    throw new Error('Cal.com API key not configured');
  }

  try {
    const response = await fetch(`${CAL_COM_API_URL}/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${CAL_COM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: reason || 'Cancelled by user',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel booking');
    }

    return await response.json();
  } catch (error) {
    console.error('Cal.com cancel error:', error);
    throw error;
  }
}

/**
 * Get event types for a user
 */
export async function getEventTypes() {
  if (!CAL_COM_API_KEY) {
    throw new Error('Cal.com API key not configured');
  }

  try {
    const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
      headers: {
        'Authorization': `Bearer ${CAL_COM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch event types');
    }

    const data = await response.json();
    return data.event_types || [];
  } catch (error) {
    console.error('Cal.com API error:', error);
    throw error;
  }
}
