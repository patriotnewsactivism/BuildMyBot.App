'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Bot, MessageSquare, Users, TrendingUp, DollarSign, Bell, LogOut, Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [bots, setBots] = useState([]);
  const [loadingBots, setLoadingBots] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchBots();
    }
  }, [user]);

  const fetchBots = async () => {
    try {
      const session = await (await import('@/lib/auth-client')).getSession();
      const response = await fetch('/api/bots', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBots(data.bots);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    } finally {
      setLoadingBots(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="text-blue-900" size={32} />
              <span className="text-xl font-bold text-slate-900">BuildMyBot</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user.user_metadata?.name || user.email}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-600 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user.user_metadata?.name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-slate-600">
            Here's what's happening with your chatbots today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Bots', value: bots.length, icon: Bot, color: 'blue' },
            { label: 'Conversations', value: '0', icon: MessageSquare, color: 'sky' },
            { label: 'Leads Captured', value: '0', icon: Users, color: 'emerald' },
            { label: 'Response Rate', value: '0%', icon: TrendingUp, color: 'violet' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}>
                  <stat.icon size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bots Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Your Chatbots</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 transition">
              <Plus size={20} />
              Create Bot
            </button>
          </div>

          {loadingBots ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No chatbots yet
              </h3>
              <p className="text-slate-600 mb-6">
                Create your first AI chatbot to get started!
              </p>
              <button className="px-6 py-3 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-950 transition">
                Create Your First Bot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map((bot: any) => (
                <div
                  key={bot.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: bot.theme_color }}
                    >
                      {bot.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{bot.name}</h3>
                      <p className="text-sm text-slate-500">{bot.type}</p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        bot.active ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {bot.system_prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{bot.model}</span>
                    <span>0 conversations</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition text-left">
            <h3 className="font-semibold text-slate-900 mb-1">View Analytics</h3>
            <p className="text-sm text-slate-600">
              Track performance and insights
            </p>
          </button>

          <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition text-left">
            <h3 className="font-semibold text-slate-900 mb-1">Manage Leads</h3>
            <p className="text-sm text-slate-600">
              View and export captured leads
            </p>
          </button>

          <button className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-200 hover:shadow-md transition text-left">
            <h3 className="font-semibold text-slate-900 mb-1">Settings</h3>
            <p className="text-sm text-slate-600">
              Configure account and billing
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
