import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface LayoutContextValue {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  sidebarWidth: number;
  isMobile: boolean;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

const SIDEBAR_WIDTH_EXPANDED = 256; // 16rem / w-64
const SIDEBAR_WIDTH_COLLAPSED = 64; // 4rem / w-16
const MOBILE_BREAKPOINT = 768;

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        sidebarCollapsed,
        setSidebarOpen,
        setSidebarCollapsed,
        toggleSidebar,
        toggleCollapse,
        sidebarWidth,
        isMobile,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextValue => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

export { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED, MOBILE_BREAKPOINT };
