'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Download } from 'lucide-react';

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase.from('templates').select('*').eq('is_featured', true);
    setTemplates(data || []);
    setLoading(false);
  };

  const installTemplate = async (templateId: string) => {
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/marketplace-install-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ templateId }),
    });

    if (response.ok) {
      alert('Template installed successfully!');
    } else {
      const error = await response.json();
      alert(`Error: ${error.error}`);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Bot Marketplace</h1>
      <p className="text-gray-600 mb-8">Install pre-built bot templates for your business</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{template.category}</span>
              <button
                onClick={() => installTemplate(template.id)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No templates available yet. Check back soon!
        </div>
      )}
    </div>
  );
}
