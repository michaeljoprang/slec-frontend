'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { tokens } from '@/lib/themeTokens';

export interface SidebarContextType {
  collapsed: boolean;
  isCollapsed: boolean;
  open: boolean;
  sidebarOpen: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
  isFullscreen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  setMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const defaultContextValue: SidebarContextType = {
  collapsed: false,
  isCollapsed: false,
  open: true,
  sidebarOpen: true,
  sidebarWidth: tokens.sidebarWidth,
  mobileOpen: false,
  isFullscreen: false,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
  setMobileOpen: () => {},
  openMobile: () => {},
  closeMobile: () => {},
};

const SidebarContext = createContext<SidebarContextType>(defaultContextValue);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const sidebarWidth = isFullscreen
    ? 0
    : collapsed
    ? tokens.sidebarCollapsedWidth
    : tokens.sidebarWidth;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const value = useMemo<SidebarContextType>(
    () => ({
      collapsed,
      isCollapsed: collapsed,
      open: !collapsed && !isFullscreen,
      sidebarOpen: !collapsed && !isFullscreen,
      sidebarWidth,
      mobileOpen,
      isFullscreen,
      toggleSidebar,
      setSidebarCollapsed,
      setMobileOpen,
      openMobile,
      closeMobile,
    }),
    [collapsed, mobileOpen, isFullscreen, sidebarWidth, toggleSidebar, openMobile, closeMobile]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

export default SidebarContext;
