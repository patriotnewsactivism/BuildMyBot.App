'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import KnowledgeBase from '@/components/KnowledgeBase/KnowledgeBase';

export default function BotKnowledgeBasePage() {
  const params = useParams();
  const botId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="mt-2 text-gray-600">
            Train your bot with custom documents and knowledge
          </p>
        </div>

        <KnowledgeBase botId={botId} />
      </div>
    </div>
  );
}
