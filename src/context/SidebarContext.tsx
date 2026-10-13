'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { tokens } from '@/lib/theme';

export interface SidebarContextType {
  collapsed: boolean;
  isCollapsed: boolean;
  open: boolean;
  sidebarWidth: number;
  mobileOpen: boolean;
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
  sidebarWidth: tokens.sidebarWidth,
  mobileOpen: false,
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

  const sidebarWidth = collapsed
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
      open: !collapsed,
      sidebarWidth,
      mobileOpen,
      toggleSidebar,
      setSidebarCollapsed,
      setMobileOpen,
      openMobile,
      closeMobile,
    }),
    [collapsed, mobileOpen, sidebarWidth, toggleSidebar, openMobile, closeMobile]
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
