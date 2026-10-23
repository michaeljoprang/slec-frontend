'use client';

import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';
import { tokens } from '@/lib/themeTokens';
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
    setSidebarCollapsed,
    mobileOpen,
    openMobile: handleMobileOpen,
    closeMobile: handleMobileClose,
  } = useSidebar();

  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const prevCollapsedRef = React.useRef(sidebarCollapsed);

  // Monitor fullscreen change events
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        // Pulihkan state sidebar saat keluar dari fullscreen
        setSidebarCollapsed(prevCollapsedRef.current);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setSidebarCollapsed]);

  const handleToggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      prevCollapsedRef.current = sidebarCollapsed;
      setSidebarCollapsed(true); // Otomatis ciutkan/sembunyikan sidebar saat masuk fullscreen
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setSidebarCollapsed(prevCollapsedRef.current);
      }).catch(() => {});
    }
  };

  const currentSidebarWidth = isFullscreen ? 0 : sidebarWidth;

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: tokens.colors.background,
        '--sidebar-width': `${currentSidebarWidth}px`,
        '@media print': {
          display: 'block !important',
          minHeight: '0 !important',
          height: 'auto !important',
          overflow: 'visible !important',
          bgcolor: '#ffffff !important',
        },
      }}
    >
      <Box className="no-print" sx={{ '@media print': { display: 'none !important' } }}>
        {/* Sidebar disembunyikan otomatis saat mode fullscreen aktif */}
        <Box
          sx={{
            display: isFullscreen ? 'none' : 'block',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={handleToggle}
            mobileOpen={mobileOpen}
            onMobileClose={handleMobileClose}
          />
        </Box>

        <Header
          sidebarWidth={currentSidebarWidth}
          pageTitle={pageTitle}
          onMobileMenuOpen={handleMobileOpen}
          onToggleSidebar={handleToggle}
          isSidebarCollapsed={sidebarCollapsed}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: isFullscreen ? '100%' : { xs: '100%', md: `calc(100% - ${currentSidebarWidth}px)` },
          maxWidth: '100%',
          ml: { xs: 0, md: `${currentSidebarWidth}px` },
          mt: `${tokens.headerHeight}px`,
          p: { xs: 2, sm: 3 },
          transition: 'margin-left 0.2s ease, width 0.2s ease',
          minHeight: `calc(100vh - ${tokens.headerHeight}px)`,
          overflow: 'auto',
          '@media print': {
            m: '0 !important',
            p: '0 !important',
            minHeight: '0 !important',
            height: 'auto !important',
            overflow: 'visible !important',
            maxWidth: '100% !important',
            width: '100% !important',
            display: 'block !important',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
