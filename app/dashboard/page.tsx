'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Bot, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    bots: 0,
    leads: 0,
    conversations: 0,
    conversationsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get bot count
      const { count: botCount } = await supabase
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id);

      // Get lead count
      const { count: leadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id);

      // Get total conversations
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id);

      // Get conversations this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user!.id)
        .gte('created_at', startOfMonth.toISOString());

      // Get last 7 days of conversations
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user!.id)
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString());

        last7Days.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          conversations: count || 0,
        });
      }

      setStats({
        bots: botCount || 0,
        leads: leadCount || 0,
        conversations: totalConversations || 0,
        conversationsThisMonth: monthConversations || 0,
      });
      setAnalyticsData(last7Days);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  const statCards = [
    { label: 'Active Bots', value: stats.bots, icon: Bot, color: 'blue' },
    { label: 'Total Leads', value: stats.leads, icon: Users, color: 'green' },
    { label: 'Total Conversations', value: stats.conversations, icon: MessageSquare, color: 'purple' },
    { label: 'This Month', value: stats.conversationsThisMonth, icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.label}</h3>
                <Icon className={`w-8 h-8 text-${stat.color}-500`} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation Activity (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="conversations" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
