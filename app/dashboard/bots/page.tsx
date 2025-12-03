'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Bot as BotType } from '@/types';
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import { validateSystemPrompt, validateBotName, validateTemperature, validateModel, validateColor } from '@/lib/validation';

export default function BotsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBot, setNewBot] = useState({
    name: '',
    type: 'General',
    systemPrompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  });

  useEffect(() => {
    if (user) {
      loadBots();
    }
  }, [user]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBots(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading bots:', error);
      setLoading(false);
    }
  };

  const handleCreateBot = async () => {
    try {
      // Validate bot name
      const nameValidation = validateBotName(newBot.name);
      if (!nameValidation.valid) {
        alert(nameValidation.error);
        return;
      }

      // Validate system prompt
      const promptValidation = validateSystemPrompt(newBot.systemPrompt);
      if (!promptValidation.valid) {
        alert(promptValidation.error);
        return;
      }

      // Validate temperature
      const tempValidation = validateTemperature(newBot.temperature);
      if (!tempValidation.valid) {
        alert(tempValidation.error);
        return;
      }

      // Validate model
      const modelValidation = validateModel(newBot.model);
      if (!modelValidation.valid) {
        alert(modelValidation.error);
        return;
      }

      // Check plan limits BEFORE creation
      const { data: session } = await supabase.auth.getSession();
      const limitCheck = await fetch('/api/billing/check-limits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceType: 'bot' }),
      });

      const limitResult = await limitCheck.json();

      if (!limitResult.allowed) {
        alert(limitResult.message || 'Plan limit reached. Please upgrade.');
        return;
      }

      // Create bot with validated data
      const { data, error } = await supabase
        .from('bots')
        .insert({
          owner_id: user!.id,
          name: newBot.name.trim(),
          type: newBot.type,
          system_prompt: newBot.systemPrompt.trim(),
          model: newBot.model,
          temperature: newBot.temperature,
          active: true,
          conversations_count: 0,
          theme_color: '#3B82F6',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A bot with this name already exists');
        }
        throw error;
      }

      setBots([data, ...bots]);
      setShowCreateModal(false);
      setNewBot({
        name: '',
        type: 'General',
        systemPrompt: '',
        model: 'gpt-4o-mini',
        temperature: 0.7,
      });
    } catch (error: any) {
      console.error('Bot creation error:', error);
      alert(`Error creating bot: ${error.message}`);
    }
  };

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    try {
      // Explicit owner_id validation
      const { data, error } = await supabase
        .from('bots')
        .update({ active: !currentStatus })
        .eq('id', botId)
        .eq('owner_id', user!.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bot not found or access denied');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Update failed - bot may not exist or you lack permission');
      }

      loadBots();
    } catch (error: any) {
      console.error('Error toggling bot status:', error);
      alert(error.message || 'Failed to update bot');
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) return;

    try {
      // Explicit owner_id validation
      const { data, error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId)
        .eq('owner_id', user!.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Bot not found or access denied');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Deletion failed - bot may not exist or you lack permission');
      }

      loadBots();
    } catch (error: any) {
      console.error('Error deleting bot:', error);
      alert(error.message || 'Failed to delete bot');
    }
  };

  if (loading) {
    return <div>Loading bots...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bots</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Bot
        </button>
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((bot) => (
          <div key={bot.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl">{bot.avatar || '🤖'}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{bot.name}</h3>
                  <p className="text-sm text-gray-500">{bot.type}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  bot.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {bot.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bot.systemPrompt}</p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>Model: {bot.model}</span>
              <span>{bot.conversationsCount} convos</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => toggleBotStatus(bot.id, bot.active)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {bot.active ? (
                  <>
                    <PowerOff className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteBot(bot.id)}
                className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No bots yet. Create your first bot to get started!</p>
        </div>
      )}

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Bot</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Name
                </label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Customer Support Bot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newBot.type}
                  onChange={(e) => setNewBot({ ...newBot, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option>General</option>
                  <option>Customer Support</option>
                  <option>Sales</option>
                  <option>Real Estate</option>
                  <option>Recruitment</option>
                  <option>Travel</option>
                  <option>City Government</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Prompt
                </label>
                <textarea
                  value={newBot.systemPrompt}
                  onChange={(e) => setNewBot({ ...newBot, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
                  placeholder="You are a helpful customer support assistant..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <select
                    value={newBot.model}
                    onChange={(e) => setNewBot({ ...newBot, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newBot.temperature}
                    onChange={(e) => setNewBot({ ...newBot, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBot}
                disabled={!newBot.name || !newBot.systemPrompt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Bot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
