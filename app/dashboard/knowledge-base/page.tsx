'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Upload, Link as LinkIcon, FileText, Trash2 } from 'lucide-react';

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadMode, setUploadMode] = useState<'text' | 'url' | null>(null);
  const [newContent, setNewContent] = useState({ text: '', url: '' });

  useEffect(() => {
    if (user) {
      loadBots();
      loadKnowledge();
    }
  }, [user]);

  const loadBots = async () => {
    const { data } = await supabase.from('bots').select('*').eq('owner_id', user!.id);
    setBots(data || []);
  };

  const loadKnowledge = async () => {
    const { data } = await supabase.from('knowledge_base').select('*').eq('owner_id', user!.id);
    setKnowledgeItems(data || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!selectedBot) {
      alert('Please select a bot');
      return;
    }

    const content = uploadMode === 'text' ? newContent.text : newContent.url;
    if (!content) return;

    // Call Edge Function to embed content
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed-knowledge-base`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        botId: selectedBot,
        content,
        sourceType: uploadMode,
        sourceUrl: uploadMode === 'url' ? newContent.url : undefined,
      }),
    });

    if (response.ok) {
      loadKnowledge();
      setUploadMode(null);
      setNewContent({ text: '', url: '' });
    } else {
      alert('Error uploading content');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setUploadMode('text')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-5 h-5" />
            Add Text
          </button>
          <button
            onClick={() => setUploadMode('url')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <LinkIcon className="w-5 h-5" />
            Add URL
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Filter by Bot</option>
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>{bot.name}</option>
            ))}
          </select>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {knowledgeItems
              .filter((item) => !selectedBot || item.bot_id === selectedBot)
              .map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 line-clamp-2">{item.content}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.source_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bots.find((b) => b.id === item.bot_id)?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {uploadMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Add {uploadMode === 'text' ? 'Text' : 'URL'} Content</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bot</label>
                <select
                  value={selectedBot}
                  onChange={(e) => setSelectedBot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a bot</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </div>

              {uploadMode === 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={newContent.text}
                    onChange={(e) => setNewContent({ ...newContent, text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg h-64"
                    placeholder="Paste your content here..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={newContent.url}
                    onChange={(e) => setNewContent({ ...newContent, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://example.com"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setUploadMode(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload & Embed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
