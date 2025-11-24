import React from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Briefcase, Bot, Megaphone, Globe, Shield, ShoppingBag, Phone } from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, role }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bots', label: 'My Bots', icon: Bot },
    { id: 'chat-logs', label: 'Conversations', icon: MessageSquare },
    { id: 'leads', label: 'Lead CRM', icon: Users },
    { id: 'phone', label: 'Phone Agent', icon: Phone },
    { id: 'marketing', label: 'AI Marketing', icon: Megaphone },
    { id: 'website', label: 'AI Sites', icon: Globe },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'billing', label: 'Billing & Plan', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (role === UserRole.RESELLER || role === UserRole.ADMIN) {
    menuItems.splice(1, 0, { id: 'reseller', label: 'Partner Portal', icon: Briefcase });
  }

  if (role === UserRole.ADMIN) {
    menuItems.push({ id: 'admin', label: 'Super Admin', icon: TrendingUp });
  }

  return (
    <div className="w-64 bg-[#0f172a] text-slate-400 h-screen flex flex-col fixed left-0 top-0 border-r border-slate-900 z-10">
      <div className="p-6 flex items-center gap-2 text-white font-bold text-xl tracking-tight">
        <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50">
          <Bot size={20} className="text-white" />
        </div>
        <span className="text-slate-100">BuildMyBot</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/40'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <item.icon size={18} className={`${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-900 bg-[#0B1120]">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Current Plan</p>
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-200 font-bold">Professional</span>
            <span className="bg-emerald-900/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-900/50">Active</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-[65%]"></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">650 / 1,000 conversations</p>
        </div>
      </div>
    </div>
  );
};