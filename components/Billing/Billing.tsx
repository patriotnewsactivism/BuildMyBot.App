import React, { useState } from 'react';
import { CheckCircle, Shield, Crown, Loader, Bot, MessageSquare, BarChart3 } from 'lucide-react';
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
         {Object.entries(PLANS).map(([key, plan]: [string, any]) => {
           const isCurrent = key === currentPlan;
           const isEnterprise = key === PlanType.ENTERPRISE;
           const isProfessional = key === PlanType.PROFESSIONAL;
           
           // Distinct Title Logic for Enterprise
           const displayTitle = isEnterprise ? 'Enterprise / White-label' : plan.name;
           
           return (
             <div 
                key={key} 
                className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 h-full ${
                  isProfessional 
                    ? 'bg-white border-2 border-blue-900 shadow-xl scale-105 z-10' 
                    : isEnterprise 
                        ? 'bg-slate-900 border border-slate-800 text-white shadow-lg' 
                        : 'bg-white border border-slate-200 hover:shadow-lg'
                }`}
              >
                {/* Most Popular Badge */}
                {isProfessional && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-900 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm">
                    Most Popular
                  </div>
                )}

                {/* Ultimate Power Badge */}
                {isEnterprise && (
                   <div className="mb-4 flex items-center gap-1.5 text-yellow-400 font-bold text-[10px] uppercase tracking-widest">
                    <Crown size={12} fill="currentColor" /> Ultimate Power
                  </div>
                )}
                
                {/* Header */}
                <div className="mb-6">
                   <h3 className={`text-lg font-bold ${isEnterprise ? 'text-white' : 'text-slate-900'}`}>{displayTitle}</h3>
                   <div className="flex items-baseline mt-2">
                     <span className={`text-4xl font-extrabold ${isEnterprise ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                     <span className={`text-sm ml-1 ${isEnterprise ? 'text-slate-400' : 'text-slate-500'}`}>/mo</span>
                   </div>
                </div>

                {/* Top Metrics */}
                <div className="space-y-3 mb-6">
                    <div className={`flex items-center gap-3 text-sm font-medium ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={18} className={isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} />
                        <span>{plan.bots >= 9999 ? 'Unlimited' : plan.bots} Bot(s)</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm font-medium ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={18} className={isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} />
                        <span>{plan.conversations.toLocaleString()} Conversations</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm font-medium ${isEnterprise ? 'text-slate-300' : 'text-slate-700'}`}>
                        <CheckCircle size={18} className={isEnterprise ? 'text-yellow-400' : 'text-emerald-500'} />
                        <span>{isEnterprise ? 'Enterprise Analytics' : 'Advanced Analytics'}</span>
                    </div>
                </div>

                {/* Separator */}
                <div className="mb-4">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isEnterprise ? 'text-slate-500' : 'text-slate-400'}`}>
                        Everything in this plan
                    </p>
                    <div className={`h-px w-full ${isEnterprise ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                </div>
                
                {/* Feature List */}
                <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature: string, idx: number) => (
                      <li key={idx} className={`flex items-start gap-3 text-xs leading-relaxed ${isEnterprise ? 'text-slate-400' : 'text-slate-600'}`}>
                        <CheckCircle size={14} className={`shrink-0 mt-0.5 ${isEnterprise ? 'text-yellow-500/50' : 'text-emerald-500/50'}`} /> 
                        <span>{feature}</span>
                      </li>
                    ))}
                </ul>

                {/* Action Button */}
                <button 
                  onClick={() => handleUpgrade(key)}
                  disabled={isCurrent || processingPlan !== null}
                  className={`w-full py-3 rounded-lg font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 ${
                    isCurrent 
                    ? 'bg-slate-100 text-slate-400 cursor-default shadow-none border border-slate-200' 
                    : isEnterprise 
                        ? 'bg-white text-slate-900 hover:bg-slate-200'
                        : isProfessional
                            ? 'bg-blue-900 text-white hover:bg-blue-950 shadow-blue-900/20'
                            : 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {processingPlan === key ? <Loader className="animate-spin" size={16} /> : null}
                  {isCurrent ? 'Current Plan' : isEnterprise ? 'Get Enterprise' : `Choose ${plan.name}`}
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