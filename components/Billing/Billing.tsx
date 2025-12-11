import React, { useState, useEffect } from 'react';
import { Check, Shield, Zap, Star, Crown, Loader, CreditCard, BarChart3, AlertCircle } from 'lucide-react';
import { PLANS } from '../../constants';
import { PlanType, User } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface BillingProps {
  user?: User;
}

interface UsageStats {
  conversations: number;
  conversationLimit: number;
  bots: number;
  botLimit: number;
}

interface Subscription {
  plan: string;
  status: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

const getSupabaseUrl = () => process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const currentPlan = user?.plan || PlanType.FREE;
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current subscription and usage on mount
  useEffect(() => {
    const fetchBillingData = async () => {
      if (!user || !supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const supabaseUrl = getSupabaseUrl();
        const response = await fetch(`${supabaseUrl}/functions/v1/stripe-billing`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'get-subscription' }),
        });

        if (response.ok) {
          const data = await response.json();
          setUsage(data.usage);
          setSubscription(data.subscription);
        }
      } catch (e) {
        console.error('Error fetching billing data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [user]);

  const handleUpgrade = async (planId: string) => {
    if (!user || !supabase) return;

    // Don't allow downgrade through this flow
    if (planId === 'FREE') {
      setError('Please use the Manage Subscription button to cancel your plan.');
      return;
    }

    setProcessingPlan(planId);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to upgrade');
      }

      const supabaseUrl = getSupabaseUrl();
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-checkout',
          plan: planId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (e) {
      console.error('Upgrade error:', e);
      setError(e instanceof Error ? e.message : 'Failed to start upgrade process');
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user || !supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const supabaseUrl = getSupabaseUrl();
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-billing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-portal',
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Portal error:', e);
    }
  };

  // Check URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      // Show success message and refresh
      setError(null);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('canceled') === 'true') {
      setError('Checkout was canceled. No charges were made.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-[95rem] mx-auto pb-10">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Current Usage Section */}
      {usage && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-900" /> Current Usage
              </h3>
              <p className="text-sm text-slate-500">Your usage this billing period</p>
            </div>
            {currentPlan !== PlanType.FREE && (
              <button
                onClick={handleManageSubscription}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
              >
                <CreditCard size={16} /> Manage Subscription
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Conversations</span>
                <span className="font-medium text-slate-800">
                  {usage.conversations.toLocaleString()} / {usage.conversationLimit === 9999 ? 'Unlimited' : usage.conversationLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.conversations / usage.conversationLimit > 0.9 ? 'bg-red-500' :
                    usage.conversations / usage.conversationLimit > 0.7 ? 'bg-amber-500' : 'bg-blue-900'
                  }`}
                  style={{ width: `${Math.min(100, (usage.conversations / usage.conversationLimit) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Active Bots</span>
                <span className="font-medium text-slate-800">
                  {usage.bots} / {usage.botLimit === 9999 ? 'Unlimited' : usage.botLimit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    usage.bots / usage.botLimit > 0.9 ? 'bg-red-500' :
                    usage.bots / usage.botLimit > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (usage.bots / usage.botLimit) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">Upgrade your Plan</h2>
        <p className="text-slate-500 mt-2">Scale your business with our power-packed tiers. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
         {Object.entries(PLANS).map(([key, plan]: [string, any]) => {
           const isCurrent = key === currentPlan;
           const isEnterprise = key === PlanType.ENTERPRISE;
           const isFree = key === PlanType.FREE;
           
           return (
             <div 
                key={key} 
                className={`relative bg-white rounded-2xl p-6 border transition-all duration-300 flex flex-col hover:shadow-lg ${
                  isCurrent 
                    ? 'border-blue-900 shadow-xl shadow-blue-100 scale-105 z-10' 
                    : isEnterprise 
                        ? 'border-slate-800 shadow-md ring-1 ring-slate-800/10' 
                        : 'border-slate-200 hover:border-blue-300 shadow-sm'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-900 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Current Plan
                  </div>
                )}
                {isEnterprise && (
                   <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                    <Crown size={12} fill="currentColor" className="text-yellow-400" /> Ultimate
                  </div>
                )}
                <div className="mb-4">
                   <h3 className={`text-lg font-bold ${isEnterprise ? 'text-slate-900' : 'text-slate-800'}`}>{plan.name}</h3>
                   <div className="flex items-baseline mt-2">
                     <span className="text-3xl font-extrabold text-slate-900">${plan.price}</span>
                     <span className="text-slate-500 text-sm ml-1">/mo</span>
                   </div>
                   <p className="text-xs text-slate-400 mt-2 h-4">
                     {isEnterprise ? 'For agencies & scale' : isFree ? 'Forever free' : 'For growing businesses'}
                   </p>
                </div>
                
                <div className="space-y-3 flex-1 mb-8">
                  {/* Dynamic Feature List */}
                  <div className="pt-2 space-y-3 border-t border-slate-50 mt-2">
                    {plan.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check size={16} className={`shrink-0 mt-0.5 ${isEnterprise ? 'text-yellow-500 fill-yellow-500' : 'text-emerald-500'}`} /> 
                        <span className="leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => handleUpgrade(key)}
                  disabled={isCurrent || processingPlan !== null}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition shadow-md flex items-center justify-center gap-2 ${
                    isCurrent 
                    ? 'bg-slate-100 text-slate-400 cursor-default shadow-none' 
                    : isEnterprise 
                        ? 'bg-slate-900 text-white hover:bg-black hover:shadow-lg'
                        : 'bg-blue-900 text-white hover:bg-blue-950 hover:shadow-blue-200'
                  }`}
                >
                  {processingPlan === key ? <Loader className="animate-spin" size={16} /> : null}
                  {isCurrent ? 'Current Plan' : isEnterprise ? 'Upgrade to Enterprise' : `Upgrade to ${plan.name}`}
                </button>
             </div>
           );
         })}
      </div>
      
      <div className="mt-12 p-6 bg-slate-100 rounded-xl border border-slate-200 text-center max-w-3xl mx-auto">
        <h4 className="font-bold text-slate-800 mb-2">Enterprise Customization</h4>
        <p className="text-slate-500 text-sm mb-4">
            Need more than 50,000 conversations? Our Enterprise plan scales with you at just <strong>$0.01</strong> per additional conversation.
            We also offer custom SLA and on-premise deployment.
        </p>
        <button className="text-blue-900 font-medium text-sm hover:underline flex items-center justify-center gap-1 mx-auto">
            <Shield size={14} /> Contact our Sales Team
        </button>
      </div>
    </div>
  );
};