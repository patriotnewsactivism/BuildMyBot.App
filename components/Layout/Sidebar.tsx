import React from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Briefcase, Bot, Megaphone, Globe, Shield, ShoppingBag, Phone, X } from 'lucide-react';
import { UserRole, User } from '../../types';
import { PLANS } from '../../constants';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  usage?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, role, isOpen, onClose, user, usage = 0 }) => {
  const isAdmin = role === UserRole.ADMIN || role === UserRole.MASTER_ADMIN || role === UserRole.LIMITED_ADMIN;
  const isPartnerRole = role === UserRole.RESELLER || isAdmin;
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

  if (isPartnerRole) {
    menuItems.splice(1, 0, { id: 'reseller', label: 'Partner Portal', icon: Briefcase });
  }

  // Admin has a special separate dashboard, but can access it via sidebar if logged in as admin context
  if (isAdmin) {
    menuItems.push({ id: 'admin', label: role === UserRole.LIMITED_ADMIN ? 'Admin (View Only)' : 'Master Admin', icon: TrendingUp });
  }

  const handleNavigation = (viewId: string) => {
    setView(viewId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const planName = user?.plan || 'Free';
  const planLimit = PLANS[user?.plan || 'FREE']?.conversations || 60;
  const usagePercent = Math.min(100, Math.round((usage / planLimit) * 100));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#0f172a] text-slate-400 border-r border-slate-900 z-50 transition-transform duration-300 ease-in-out transform shadow-2xl ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50">
              <Bot size={20} className="text-white" />
            </div>
            <span className="text-slate-100">BuildMyBot</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
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

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-900 bg-[#0B1120]">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Current Plan</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-200 font-bold truncate capitalize">{planName.toLowerCase()}</span>
              <span className="bg-emerald-900/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-900/50">Active</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{width: `${usagePercent}%`}}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex justify-between">
               <span>{usage.toLocaleString()} / {planLimit.toLocaleString()} msgs</span>
               {usagePercent > 90 && <span className="text-red-400 font-bold cursor-pointer hover:underline" onClick={() => setView('billing')}>Upgrade</span>}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};