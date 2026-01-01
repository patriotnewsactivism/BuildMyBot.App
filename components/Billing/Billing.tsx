import React, { useState } from 'react';
import { Check, Shield, Zap, Star, Crown, Loader } from 'lucide-react';
import { PLANS } from '../../constants';
import { PlanType, User } from '../../types';
import { dbService } from '../../services/dbService';

interface BillingProps {
  user?: User;
}

export const Billing: React.FC<BillingProps> = ({ user }) => {
  const currentPlan = user?.plan || PlanType.FREE;
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    setProcessingPlan(planId);
    
    // Simulate Stripe Checkout API Call
    setTimeout(async () => {
        try {
            await dbService.updateUserPlan(user.id, planId as PlanType);
            // In real app, this would redirect to Stripe URL
            alert(`Upgrade successful! Welcome to the ${planId} plan.`);
        } catch (e) {
            console.error(e);
            alert("Upgrade failed. Please try again.");
        } finally {
            setProcessingPlan(null);
        }
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-[95rem] mx-auto pb-10">
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