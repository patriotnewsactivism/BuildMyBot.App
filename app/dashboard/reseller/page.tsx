'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/Auth/AuthProvider';
import { Users, DollarSign, TrendingUp, Award } from 'lucide-react';

export default function ResellerPage() {
  const { user } = useAuth();
  const [resellerAccount, setResellerAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadResellerAccount();
    }
  }, [user]);

  const loadResellerAccount = async () => {
    const { data } = await supabase
      .from('reseller_accounts')
      .select('*')
      .eq('owner_id', user!.id)
      .single();

    setResellerAccount(data);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  if (!resellerAccount) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Reseller Program</h1>
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Become a Reseller</h2>
          <p className="text-gray-600 mb-4">
            Join our reseller program and earn commissions by referring clients.
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Apply Now
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Clients', value: resellerAccount.total_clients, icon: Users, color: 'blue' },
    { label: 'Total Revenue', value: `$${resellerAccount.total_revenue || 0}`, icon: DollarSign, color: 'green' },
    { label: 'Pending Payout', value: `$${resellerAccount.pending_payout || 0}`, icon: TrendingUp, color: 'purple' },
    { label: 'Current Tier', value: resellerAccount.tier, icon: Award, color: 'orange' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Reseller Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{stat.label}</h3>
                <Icon className={`w-8 h-8 text-${stat.color}-500`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Your Referral Code</h2>
        <div className="flex items-center gap-4">
          <code className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-lg font-mono">
            {resellerAccount.referral_code}
          </code>
          <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
