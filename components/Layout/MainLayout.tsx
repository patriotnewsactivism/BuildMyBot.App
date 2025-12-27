import React from 'react';
import { Menu, Bot as BotIcon } from 'lucide-react';
import { useLayout, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from './LayoutContext';

interface MainLayoutProps {
  children: React.ReactNode;
  notification?: string | null;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, notification }) => {
  const { sidebarCollapsed, setSidebarOpen, isMobile } = useLayout();

  const marginLeft = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED);

  return (
    <main
      className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out"
      style={{ marginLeft: `${marginLeft}px` }}
    >
      {/* Mobile Header */}
      <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50 text-white">
            <BotIcon size={20} />
          </div>
          BuildMyBot
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {notification && (
          <div className="fixed top-6 right-6 z-40 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce-slow flex items-center gap-3">
            <span className="text-blue-400">*</span> {notification}
          </div>
        )}
        {children}
      </div>
    </main>
  );
};

export default MainLayout;
