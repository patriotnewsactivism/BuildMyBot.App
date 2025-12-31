import React from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, Settings, Briefcase, Bot, Megaphone, Globe, Shield, ShoppingBag, Phone, X, ChevronLeft, ChevronRight, Code, Sparkles, LogOut, Home } from 'lucide-react';
import { UserRole, User } from '../../types';
import { PLANS } from '../../constants';
import { useLayout, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from './LayoutContext';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  role: UserRole;
  user?: User;
  usage?: number;
  onLogout?: () => void;
  onViewLandingPage?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, role, user, usage = 0, onLogout, onViewLandingPage }) => {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleCollapse, isMobile } = useLayout();

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
    { id: 'developers', label: 'API Docs', icon: Code },
    { id: 'expert-setup', label: 'Expert Setup', icon: Sparkles },
    { id: 'billing', label: 'Billing & Plan', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isPartnerRole) {
    menuItems.splice(1, 0, { id: 'reseller', label: 'Partner Portal', icon: Briefcase });
  }

  if (isAdmin) {
    menuItems.push({ id: 'admin', label: role === UserRole.LIMITED_ADMIN ? 'Admin (View Only)' : 'Master Admin', icon: TrendingUp });
  }

  const handleNavigation = (viewId: string) => {
    setView(viewId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const planName = user?.plan || 'Free';
  const planLimit = PLANS[user?.plan || 'FREE']?.conversations || 60;
  const usagePercent = Math.min(100, Math.round((usage / planLimit) * 100));

  const sidebarWidth = sidebarCollapsed && !isMobile ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[#0f172a] text-slate-400 border-r border-slate-900 z-50
          transition-all duration-300 ease-in-out flex flex-col shadow-2xl
          ${isMobile
            ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
            : 'translate-x-0'
          }`}
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-slate-800/50">
          <div className={`flex items-center gap-2 text-white font-bold text-xl tracking-tight overflow-hidden ${sidebarCollapsed && !isMobile ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50 shrink-0">
              <Bot size={20} className="text-white" />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <span className="text-slate-100 whitespace-nowrap">BuildMyBot</span>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}
                ${currentView === item.id
                  ? 'bg-blue-900 text-white shadow-lg shadow-blue-900/40'
                  : 'hover:bg-slate-800 hover:text-slate-100'
                }`}
            >
              <item.icon
                size={20}
                className={`shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}
              />
              {(!sidebarCollapsed || isMobile) && (
                <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout & Homepage Buttons */}
        <div className="px-2 pb-2 space-y-1 border-t border-slate-800/50 pt-2">
          {onViewLandingPage && (
            <button
              onClick={onViewLandingPage}
              title={sidebarCollapsed && !isMobile ? 'View Homepage' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group hover:bg-slate-800 hover:text-slate-100
                ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}
            >
              <Home
                size={20}
                className="shrink-0 text-slate-500 group-hover:text-slate-300"
              />
              {(!sidebarCollapsed || isMobile) && (
                <span className="font-medium text-sm whitespace-nowrap overflow-hidden">View Homepage</span>
              )}
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              title={sidebarCollapsed && !isMobile ? 'Logout' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group hover:bg-red-900/20 hover:text-red-400
                ${sidebarCollapsed && !isMobile ? 'justify-center' : ''}`}
            >
              <LogOut
                size={20}
                className="shrink-0 text-slate-500 group-hover:text-red-400"
              />
              {(!sidebarCollapsed || isMobile) && (
                <span className="font-medium text-sm whitespace-nowrap overflow-hidden">Logout</span>
              )}
            </button>
          )}
        </div>

        {/* Collapse Toggle (Desktop only) */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Footer - Plan Info */}
        <div className={`shrink-0 p-3 border-t border-slate-900 bg-[#0B1120] ${sidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
          {sidebarCollapsed && !isMobile ? (
            <button
              onClick={() => setView('billing')}
              className="w-full aspect-square bg-slate-900/50 rounded-lg border border-slate-800 flex items-center justify-center hover:bg-slate-800 transition-colors"
              title={`${planName} - ${usagePercent}% used`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  ${usagePercent > 90 ? 'border-red-500 text-red-400' : 'border-blue-600 text-blue-400'}`}
              >
                {usagePercent}%
              </div>
            </button>
          ) : (
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Current Plan</p>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-200 font-bold truncate capitalize">{planName.toLowerCase()}</span>
                <span className="bg-emerald-900/30 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-900/50">Active</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 flex justify-between">
                <span>{usage.toLocaleString()} / {planLimit.toLocaleString()} msgs</span>
                {usagePercent > 90 && (
                  <span
                    className="text-red-400 font-bold cursor-pointer hover:underline"
                    onClick={() => setView('billing')}
                  >
                    Upgrade
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
