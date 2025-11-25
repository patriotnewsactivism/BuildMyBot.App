'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AppointmentScheduler from '@/components/Appointments/AppointmentScheduler';

export default function BotAppointmentsPage() {
  const params = useParams();
  const botId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-gray-600">
            Manage appointments booked through your chatbot
          </p>
        </div>

        <AppointmentScheduler botId={botId} />
      </div>
    </div>
  );
}
