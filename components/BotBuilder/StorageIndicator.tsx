import React from 'react';
import { HardDrive, AlertTriangle, TrendingUp } from 'lucide-react';
import { StorageUsage, PlanType } from '../../types';
import { PLANS } from '../../constants';

interface StorageIndicatorProps {
  usage: StorageUsage;
  plan: PlanType;
  onUpgrade?: () => void;
  compact?: boolean;
}

export const StorageIndicator: React.FC<StorageIndicatorProps> = ({
  usage,
  plan,
  onUpgrade,
  compact = false,
}) => {
  const { usedMB, limitMB, percentage } = usage;
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const formatStorage = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb.toFixed(0)}MB`;
  };

  const planConfig = PLANS[plan];
  const canUpgrade = plan !== PlanType.ENTERPRISE;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <HardDrive
          size={16}
          className={isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-slate-400'}
        />
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">{percentage.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              isCritical
                ? 'bg-red-100 text-red-600'
                : isWarning
                ? 'bg-amber-100 text-amber-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            <HardDrive size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Knowledge Base Storage</h4>
            <p className="text-xs text-slate-500">{planConfig?.name || 'Current'} Plan</p>
          </div>
        </div>
        {(isWarning || isCritical) && (
          <AlertTriangle
            size={20}
            className={isCritical ? 'text-red-500' : 'text-amber-500'}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Used</span>
          <span className="font-medium text-slate-900">
            {formatStorage(usedMB)} / {formatStorage(limitMB)}
          </span>
        </div>

        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCritical
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : isWarning
                ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                : 'bg-gradient-to-r from-blue-400 to-blue-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span
            className={`text-xs font-medium ${
              isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            {percentage.toFixed(1)}% used
          </span>
          <span className="text-xs text-slate-400">
            {formatStorage(limitMB - usedMB)} remaining
          </span>
        </div>
      </div>

      {isWarning && canUpgrade && onUpgrade && (
        <button
          onClick={onUpgrade}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            isCritical
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
          }`}
        >
          <TrendingUp size={16} />
          {isCritical ? 'Upgrade Now - Storage Full' : 'Upgrade for More Storage'}
        </button>
      )}

      {isCritical && (
        <p className="mt-2 text-xs text-red-600 text-center">
          You cannot upload more files until you free up space or upgrade your plan.
        </p>
      )}
    </div>
  );
};

export default StorageIndicator;
