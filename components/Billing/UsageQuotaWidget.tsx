import React, { useState, useEffect } from 'react';
import { AlertCircle, Zap, TrendingUp, Crown, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { checkBillingQuota } from '../../services/aiService';

interface QuotaData {
  messages: {
    current: number;
    limit: number;
    exceeded: boolean;
  };
  bots: {
    current: number;
    limit: number;
    exceeded: boolean;
  };
  plan: string;
}

interface UsageQuotaWidgetProps {
  compact?: boolean;
  onUpgrade?: () => void;
}

export const UsageQuotaWidget: React.FC<UsageQuotaWidgetProps> = ({
  compact = false,
  onUpgrade,
}) => {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuota();
    // Refresh every 30 seconds
    const interval = setInterval(loadQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQuota = async () => {
    try {
      const data = await checkBillingQuota();
      if (data) {
        setQuota({
          messages: data.usage.messages,
          bots: data.usage.bots,
          plan: data.plan,
        });
      }
    } catch (error) {
      console.error('Error loading quota:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !quota) {
    return null;
  }

  const messagePercentage = quota.messages.limit === -1
    ? 0
    : Math.min((quota.messages.current / quota.messages.limit) * 100, 100);

  const isNearLimit = messagePercentage > 80;
  const isExceeded = quota.messages.exceeded || quota.bots.exceeded;

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${
        isExceeded
          ? 'bg-red-50 border-red-200'
          : isNearLimit
          ? 'bg-orange-50 border-orange-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExceeded ? (
              <AlertCircle size={16} className="text-red-600" />
            ) : (
              <Zap size={16} className={isNearLimit ? 'text-orange-600' : 'text-blue-600'} />
            )}
            <span className="text-sm font-medium text-slate-800">
              {quota.messages.limit === -1
                ? `${quota.messages.current} messages`
                : `${quota.messages.current}/${quota.messages.limit} messages`}
            </span>
          </div>
          {isExceeded && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              Upgrade <ArrowRight size={12} />
            </button>
          )}
        </div>
        {quota.messages.limit !== -1 && (
          <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                isExceeded ? 'bg-red-500' : isNearLimit ? 'bg-orange-500' : 'bg-blue-600'
              }`}
              style={{ width: `${messagePercentage}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b ${
        isExceeded
          ? 'bg-red-50 border-red-100'
          : isNearLimit
          ? 'bg-orange-50 border-orange-100'
          : 'bg-slate-50 border-slate-100'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isExceeded
                ? 'bg-red-100'
                : isNearLimit
                ? 'bg-orange-100'
                : 'bg-blue-100'
            }`}>
              {isExceeded ? (
                <AlertCircle size={18} className="text-red-600" />
              ) : (
                <TrendingUp size={18} className={isNearLimit ? 'text-orange-600' : 'text-blue-600'} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Usage & Limits</h3>
              <p className="text-xs text-slate-500 capitalize">{quota.plan} Plan</p>
            </div>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-900 text-white rounded-lg text-xs font-medium hover:bg-blue-950 transition"
            >
              <Crown size={14} />
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Quota Details */}
      <div className="p-4 space-y-4">
        {/* Messages Quota */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">AI Messages</span>
            <span className="text-sm font-bold text-slate-800">
              {quota.messages.limit === -1
                ? `${quota.messages.current} (Unlimited)`
                : `${quota.messages.current} / ${quota.messages.limit}`}
            </span>
          </div>
          {quota.messages.limit !== -1 && (
            <>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isExceeded
                      ? 'bg-red-500'
                      : messagePercentage > 80
                      ? 'bg-orange-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${messagePercentage}%` }}
                />
              </div>
              {quota.messages.exceeded && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Limit reached. Upgrade to continue.
                </p>
              )}
              {!quota.messages.exceeded && messagePercentage > 80 && (
                <p className="text-xs text-orange-600 mt-1">
                  {quota.messages.limit - quota.messages.current} messages remaining
                </p>
              )}
            </>
          )}
        </div>

        {/* Bots Quota */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Active Bots</span>
            <span className="text-sm font-bold text-slate-800">
              {quota.bots.limit === -1
                ? `${quota.bots.current} (Unlimited)`
                : `${quota.bots.current} / ${quota.bots.limit}`}
            </span>
          </div>
          {quota.bots.limit !== -1 && (
            <>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    quota.bots.exceeded
                      ? 'bg-red-500'
                      : quota.bots.current >= quota.bots.limit * 0.8
                      ? 'bg-orange-500'
                      : 'bg-blue-600'
                  }`}
                  style={{
                    width: `${Math.min((quota.bots.current / quota.bots.limit) * 100, 100)}%`,
                  }}
                />
              </div>
              {quota.bots.exceeded && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Bot limit reached. Upgrade to create more.
                </p>
              )}
            </>
          )}
        </div>

        {/* Upgrade CTA */}
        {(isExceeded || isNearLimit) && onUpgrade && (
          <div className={`p-3 rounded-lg ${
            isExceeded ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'
          }`}>
            <div className="text-sm font-medium text-slate-800 mb-1">
              {isExceeded ? 'Limit Reached' : 'Approaching Limit'}
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {isExceeded
                ? 'Upgrade your plan to continue using AI features.'
                : 'Consider upgrading to avoid interruptions.'}
            </p>
            <button
              onClick={onUpgrade}
              className="w-full py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-950 transition flex items-center justify-center gap-2"
            >
              <Crown size={14} />
              View Plans
            </button>
          </div>
        )}

        {/* Plan Info */}
        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 text-center">
            Your usage resets on the 1st of each month
          </div>
        </div>
      </div>
    </div>
  );
};
