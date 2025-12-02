import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, Users, MessageSquare, DollarSign, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { logger } from '../../services/loggingService';

interface UsageStats {
  totalMessages: number;
  totalLeads: number;
  totalBots: number;
  activeConversations: number;
  messagesTrend: { date: string; count: number }[];
  leadsTrend: { date: string; count: number }[];
  botUsage: { botName: string; messages: number }[];
  errorRate: number;
  avgResponseTime: number;
}

interface SystemMetrics {
  apiLatency: number;
  errorRate: number;
  uptime: number;
  activeUsers: number;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export const AnalyticsDashboard: React.FC = () => {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      logger.info('Loading analytics dashboard', { timeRange });

      const startTime = performance.now();

      // Calculate date range
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      if (!supabase) {
        logger.error('Supabase not initialized');
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warning('User not authenticated');
        return;
      }

      // Fetch usage events
      const { data: usageEvents, error: usageError } = await supabase
        .from('usage_events')
        .select('*')
        .eq('owner_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (usageError) throw usageError;

      // Fetch bots
      const { data: bots, error: botsError } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', user.id);

      if (botsError) throw botsError;

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('created_at')
        .eq('owner_id', user.id)
        .gte('created_at', startDate.toISOString());

      if (leadsError) throw leadsError;

      // Process usage events for messages
      const messageEvents = usageEvents?.filter(e => e.event_type === 'message') || [];
      const leadEvents = usageEvents?.filter(e => e.event_type === 'lead') || [];

      // Calculate trends
      const messagesTrend = calculateDailyTrend(messageEvents, daysAgo);
      const leadsTrend = calculateDailyTrend(leadEvents, daysAgo);

      // Calculate bot usage
      const botUsageMap = new Map<string, number>();
      messageEvents.forEach(event => {
        const botId = event.bot_id;
        if (botId) {
          botUsageMap.set(botId, (botUsageMap.get(botId) || 0) + (event.quantity || 1));
        }
      });

      const botUsage = Array.from(botUsageMap.entries()).map(([botId, count]) => {
        const bot = bots?.find(b => b.id === botId);
        return {
          botName: bot?.name || 'Unknown',
          messages: count,
        };
      }).sort((a, b) => b.messages - a.messages).slice(0, 5);

      // Calculate metrics
      const totalMessages = messageEvents.reduce((sum, e) => sum + (e.quantity || 1), 0);
      const totalLeads = leads?.length || 0;

      const stats: UsageStats = {
        totalMessages,
        totalLeads,
        totalBots: bots?.length || 0,
        activeConversations: 0, // Would need to query conversations table
        messagesTrend,
        leadsTrend,
        botUsage,
        errorRate: 0.02, // Mock for now
        avgResponseTime: 450, // Mock for now
      };

      setUsageStats(stats);

      // Mock system metrics
      setSystemMetrics({
        apiLatency: 250,
        errorRate: 0.5,
        uptime: 99.9,
        activeUsers: 1,
      });

      const endTime = performance.now();
      logger.logPerformance('analytics_load', endTime - startTime);

    } catch (error) {
      logger.error('Failed to load analytics', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyTrend = (events: any[], days: number) => {
    const trend: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = events.filter(e => {
        const eventDate = new Date(e.created_at).toISOString().split('T')[0];
        return eventDate === dateStr;
      }).reduce((sum, e) => sum + (e.quantity || 1), 0);

      trend.push({
        date: dateStr.slice(5), // MM-DD format
        count,
      });
    }

    return trend;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your usage, performance, and system metrics</p>
        </div>

        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Messages"
          value={usageStats?.totalMessages || 0}
          icon={MessageSquare}
          color="blue"
          trend="+12%"
        />
        <MetricCard
          title="Total Leads"
          value={usageStats?.totalLeads || 0}
          icon={Users}
          color="purple"
          trend="+8%"
        />
        <MetricCard
          title="Active Bots"
          value={usageStats?.totalBots || 0}
          icon={Activity}
          color="green"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${usageStats?.avgResponseTime || 0}ms`}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={usageStats?.messagesTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leads Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads Captured</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={usageStats?.leadsTrend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bot Usage */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Bots by Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={usageStats?.botUsage || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="botName" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="messages" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SystemMetricCard
          title="API Latency"
          value={`${systemMetrics?.apiLatency || 0}ms`}
          status="good"
        />
        <SystemMetricCard
          title="Error Rate"
          value={`${systemMetrics?.errorRate || 0}%`}
          status="good"
        />
        <SystemMetricCard
          title="Uptime"
          value={`${systemMetrics?.uptime || 0}%`}
          status="good"
        />
        <SystemMetricCard
          title="Active Users"
          value={systemMetrics?.activeUsers || 0}
          status="neutral"
        />
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.FC<any>;
  color: 'blue' | 'purple' | 'green' | 'orange';
  trend?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="text-green-600 text-sm font-medium flex items-center gap-1">
            <TrendingUp size={16} />
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-gray-600 text-sm mt-1">{title}</div>
    </div>
  );
};

interface SystemMetricCardProps {
  title: string;
  value: number | string;
  status: 'good' | 'warning' | 'error' | 'neutral';
}

const SystemMetricCard: React.FC<SystemMetricCardProps> = ({ title, value, status }) => {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${statusColors[status]}`}>{value}</div>
    </div>
  );
};
