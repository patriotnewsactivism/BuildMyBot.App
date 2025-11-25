'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, CheckCircle } from 'lucide-react';

interface Appointment {
  id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface AppointmentSchedulerProps {
  botId: string;
}

export default function AppointmentScheduler({ botId }: AppointmentSchedulerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [calComEventTypeId, setCalComEventTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
    loadBotSettings();
  }, [botId]);

  const loadBotSettings = async () => {
    try {
      const response = await fetch(`/api/bots/${botId}`);
      if (response.ok) {
        const { bot } = await response.json();
        setCalComEventTypeId(bot.cal_com_event_type_id || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments?botId=${botId}`);

      if (response.ok) {
        const { appointments } = await response.json();
        setAppointments(appointments || []);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cal_com_event_type_id: calComEventTypeId ? parseInt(calComEventTypeId) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      await loadBotSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, status }),
      });

      if (response.ok) {
        await loadAppointments();
      }
    } catch (err) {
      console.error('Failed to update appointment:', err);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Filter upcoming appointments
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.start_time) >= now && apt.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.start_time) < now || apt.status === 'cancelled'
  );

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">Appointment Scheduling</h2>
        <p className="text-gray-600 mb-6">
          Configure appointment scheduling with Cal.com integration
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cal.com Event Type ID
            </label>
            <input
              type="text"
              value={calComEventTypeId}
              onChange={(e) => setCalComEventTypeId(e.target.value)}
              placeholder="Enter your Cal.com event type ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Find this in your Cal.com event type settings
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
          <ol className="space-y-1 text-sm text-blue-800 list-decimal list-inside">
            <li>Create a Cal.com account at <a href="https://cal.com" target="_blank" rel="noopener noreferrer" className="underline">cal.com</a></li>
            <li>Create an event type (e.g., "30 Minute Meeting")</li>
            <li>Copy the event type ID from the URL</li>
            <li>Enter it above and save</li>
            <li>Your bot can now schedule appointments automatically</li>
          </ol>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Appointments ({upcomingAppointments.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {appointment.attendee_name}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {appointment.attendee_email}
                        </div>
                        {appointment.attendee_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {appointment.attendee_phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDate(appointment.start_time)} at {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </div>
                      </div>

                      {appointment.notes && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>

                    {appointment.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Past Appointments ({pastAppointments.length})
            </h3>

            <div className="space-y-3">
              {pastAppointments.slice(0, 10).map((appointment) => (
                <div
                  key={appointment.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {appointment.attendee_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(appointment.start_time)} at {formatTime(appointment.start_time)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
