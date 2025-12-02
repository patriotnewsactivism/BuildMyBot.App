import React, { useState, useEffect } from 'react';
import { TrendingUp, MessageSquare, Users, DollarSign, Activity, Clock, AlertCircle, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { supabase } from '../../services/supabaseClient';
import { logger } from '../../services/loggingService';

interface UsageStats {
  totalMessages: number;
  totalLeads: number;
  totalBots: number;
  activeUsers: number;
  messageLimit: number;
  botLimit: number;
  avgResponseTime: number;
  errorRate: number;
}

interface TimeSeriesData {
  date: string;
  messages: number;
  leads: number;
  bots: number;
}

interface SystemMetrics {
  apiLatency: number;
  errorRate: number;
  uptime: number;
  activeUsers: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({
    totalMessages: 0,
    totalLeads: 0,
    totalBots: 0,
    activeUsers: 0,
    messageLimit: 100,
    botLimit: 1,
    avgResponseTime: 450,
    errorRate: 0.02,
  });

  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    if (!supabase) {
      setLoading(false);
      logger.error('Supabase not initialized');
      return;
    }

    setLoading(true);
    logger.info('Loading analytics dashboard', { timeRange });
    const startTime = performance.now();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.warning('User not authenticated');
        return;
      }

      // Get current date ranges
      const now = new Date();
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Fetch usage events
      const { data: usageEvents, count: messageCount } = await supabase
        .from('usage_events')
        .select('*', { count: 'exact' })
        .eq('owner_id', user.id)
        .eq('event_type', 'message')
        .gte('created_at', startDate.toISOString());

      // Fetch leads
      const { count: leadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Fetch bots
      const { count: botCount } = await supabase
        .from('bots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // Get user plan limits
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      const { data: planData } = await supabase
        .from('plans')
        .select('limits')
        .eq('id', profile?.plan || 'free')
        .single();

      setStats({
        totalMessages: messageCount || 0,
        totalLeads: leadCount || 0,
        totalBots: botCount || 0,
        activeUsers: 1,
        messageLimit: planData?.limits?.messages || 100,
        botLimit: planData?.limits?.bots || 1,
        avgResponseTime: 450,
        errorRate: 0.02,
      });

      // Generate time series data
      const timeData: TimeSeriesData[] = [];
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        const dayMessages = usageEvents?.filter(e =>
          e.created_at.startsWith(dateStr)
        ).length || 0;

        timeData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          messages: dayMessages,
          leads: Math.floor(dayMessages * 0.15), // Approximate conversion rate
          bots: botCount || 0,
        });
      }

      setTimeSeriesData(timeData);

      // Set system metrics
      setSystemMetrics({
        apiLatency: 250,
        errorRate: 0.5,
        uptime: 99.9,
        activeUsers: 1,
      });

      const endTime = performance.now();
      logger.logPerformance('analytics_load', endTime - startTime);

    } catch (error) {
      logger.error('Error loading analytics', error as Error);
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const usagePercentage = stats.messageLimit === -1
    ? 0
    : Math.min((stats.totalMessages / stats.messageLimit) * 100, 100);

  const botUsagePercentage = stats.botLimit === -1
    ? 0
    : (stats.totalBots / stats.botLimit) * 100;

  const pieData = [
    { name: 'Messages Sent', value: stats.totalMessages, color: '#3b82f6' },
    { name: 'Leads Captured', value: stats.totalLeads, color: '#10b981' },
    { name: 'Bots Active', value: stats.totalBots, color: '#f59e0b' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Activity className="animate-spin text-blue-900" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
          <p className="text-slate-500">Track your AI platform performance</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-900'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">+12%</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalMessages}</div>
          <div className="text-sm text-slate-500 mt-1">Total Messages</div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Usage</span>
              <span>{stats.messageLimit === -1 ? 'Unlimited' : `${stats.totalMessages}/${stats.messageLimit}`}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${usagePercentage > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-emerald-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">+23%</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalLeads}</div>
          <div className="text-sm text-slate-500 mt-1">Leads Captured</div>
          <div className="text-xs text-slate-400 mt-2">
            ~{stats.totalMessages > 0 ? Math.round((stats.totalLeads / stats.totalMessages) * 100) : 0}% conversion rate
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-orange-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">+5%</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.totalBots}</div>
          <div className="text-sm text-slate-500 mt-1">Active Bots</div>
          <div className="text-xs text-slate-400 mt-2">
            {stats.botLimit === -1 ? 'Unlimited' : `${stats.totalBots}/${stats.botLimit} used`}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.avgResponseTime}ms</div>
          <div className="text-sm text-slate-500 mt-1">Avg Response Time</div>
          <div className="text-xs text-slate-400 mt-2">
            System latency
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-900" />
              Usage Over Time
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Messages"
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="#10b981"
                strokeWidth={2}
                name="Leads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={18} className="text-blue-900" />
            Activity Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SystemMetricCard
            title="API Latency"
            value={`${systemMetrics.apiLatency}ms`}
            status="good"
          />
          <SystemMetricCard
            title="Error Rate"
            value={`${systemMetrics.errorRate}%`}
            status="good"
          />
          <SystemMetricCard
            title="Uptime"
            value={`${systemMetrics.uptime}%`}
            status="good"
          />
          <SystemMetricCard
            title="Active Users"
            value={systemMetrics.activeUsers}
            status="neutral"
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Activity size={18} className="text-blue-900" />
            Recent Activity
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'New lead captured', detail: 'from Sales Bot', time: '2 minutes ago', color: 'emerald' },
              { action: 'Bot response sent', detail: 'Customer Support Bot', time: '5 minutes ago', color: 'blue' },
              { action: 'Knowledge base updated', detail: 'Added 3 new documents', time: '1 hour ago', color: 'orange' },
              { action: 'New bot created', detail: 'Real Estate Assistant', time: '3 hours ago', color: 'purple' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full bg-${item.color}-500`} />
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{item.action}</div>
                  <div className="text-sm text-slate-500">{item.detail}</div>
                </div>
                <div className="text-xs text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
