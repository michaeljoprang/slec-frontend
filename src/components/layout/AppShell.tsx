'use client';

import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import { tokens } from '@/lib/theme';
import { useSidebar } from '@/context/SidebarContext';

export { useSidebar } from '@/context/SidebarContext';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function AppShell({ children, pageTitle }: AppShellProps) {
  const {
    collapsed: sidebarCollapsed,
    sidebarWidth,
    toggleSidebar: handleToggle,
    mobileOpen,
    openMobile: handleMobileOpen,
    closeMobile: handleMobileClose,
  } = useSidebar();

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: tokens.colors.background,
        '--sidebar-width': `${sidebarWidth}px`,
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      <Header
        sidebarWidth={sidebarWidth}
        pageTitle={pageTitle}
        onMobileMenuOpen={handleMobileOpen}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          ml: { xs: 0, md: `${sidebarWidth}px` },
          mt: `${tokens.headerHeight}px`,
          p: { xs: 2, sm: 3 },
          transition: 'margin-left 0.2s ease',
          minHeight: `calc(100vh - ${tokens.headerHeight}px)`,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
