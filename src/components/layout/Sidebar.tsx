'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Collapse,
} from '@mui/material';
import {
  LayoutDashboard,
  ClipboardCheck,
  History,
  FileBarChart,
  Table2,
  Settings,
  ChevronRight,
  ChevronDown,
  Car,
  Menu as MenuIcon,
} from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import type { NavItem } from '@/types';

// Driver Assessment Sub-menu items (nested under "Driver Assessment")
const driverAssessmentItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'New Assessment', href: '/assessment/new', icon: 'ClipboardCheck' },
  { label: 'Assessment History', href: '/assessment/history', icon: 'History' },
  { label: 'Skill Matrix', href: '/matrix', icon: 'Table2' },
  { label: 'Reports', href: '/reports', icon: 'FileBarChart' },
];

// Data Master / Settings items
const settingsItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ClipboardCheck,
  History,
  FileBarChart,
  Table2,
  Settings,
  Car,
};

interface SidebarProps {
  collapsed?: boolean;
  isCollapsed?: boolean;
  onToggle: () => void;
  setIsCollapsed?: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({
  collapsed: collapsedProp,
  isCollapsed: isCollapsedProp,
  onToggle,
  setIsCollapsed: setIsCollapsedProp,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : Boolean(collapsedProp);
  const collapsed = isCollapsed;

  // Determine if any Driver Assessment route is currently active
  const isDriverAssessmentActive =
    pathname === '/' ||
    pathname.startsWith('/assessment') ||
    pathname.startsWith('/matrix') ||
    pathname.startsWith('/reports');

  // Collapsible Driver Assessment group - default open as requested
  const [driverAssessmentOpen, setDriverAssessmentOpen] = useState(true);

  // Auto-open if active route is inside Driver Assessment
  useEffect(() => {
    if (isDriverAssessmentActive) {
      setDriverAssessmentOpen(true);
    }
  }, [isDriverAssessmentActive]);

  const handleExpand = () => {
    if (setIsCollapsedProp) {
      setIsCollapsedProp(false);
    } else {
      onToggle();
    }
  };

  const handleCollapse = () => {
    if (setIsCollapsedProp) {
      setIsCollapsedProp(true);
    } else {
      onToggle();
    }
  };

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const width = isCollapsed ? tokens.sidebarCollapsedWidth : tokens.sidebarWidth;

  const sidebarContent = (
    <Box
      sx={{
        width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: tokens.colors.sidebar.bg, // #ffffff (White Theme khas SENDA)
        borderRight: `1px solid ${tokens.colors.sidebar.border}`, // 1px solid #e5e7eb
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo & Hamburger Header Area */}
      <Box
        sx={{
          minHeight: tokens.headerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: isCollapsed ? 1 : 2,
          py: isCollapsed ? 1.25 : 0,
          borderBottom: `1px solid ${tokens.colors.sidebar.border}`,
          flexShrink: 0,
          bgcolor: '#ffffff',
        }}
      >
        {isCollapsed ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              width: '100%',
              py: 1,
            }}
          >
            {/* 1. Tombol Hamburger di Posisi Paling Atas saat Minimized (Khas SENDA) */}
            <Tooltip title="Buka Sidebar (Expand)" placement="right">
              <IconButton
                onClick={handleExpand}
                aria-label="Buka Sidebar"
                size="small"
                sx={{
                  color: '#475569',
                  width: 36,
                  height: 36,
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  bgcolor: '#ffffff',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: '#f8fafc',
                    color: '#1e293b',
                    borderColor: '#cbd5e1',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <MenuIcon size={18} />
              </IconButton>
            </Tooltip>

            {/* 2. Logo Baru SENDA (Tepat di Bawah Tombol Hamburger) */}
            <Tooltip title="SENDA - Driver Assessment" placement="right">
              <Box
                onClick={handleExpand}
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: '6px',
                  p: 0.5,
                  width: 42,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#cbd5e1',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <img
                  src="/logo.png"
                  alt="SENDA Logo"
                  style={{
                    height: '100%',
                    width: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              px: 1,
            }}
          >
            {/* Logo Baru SENDA + Teks Sistem */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, overflow: 'hidden' }}>
              <Box
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: '6px',
                  p: 0.25,
                  width: 42,
                  height: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/logo.png"
                  alt="SENDA Logo"
                  style={{
                    height: '100%',
                    width: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </Box>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.9375rem',
                    color: '#dc2626', // Merah khas SENDA
                    letterSpacing: '0.04em',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  SENDA
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.6875rem',
                    color: '#64748b',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Driver Assessment
                </Typography>
              </Box>
            </Box>

            {/* Tombol Hamburger di Dalam Bagian Atas Sidebar saat Expanded (Khas SENDA) */}
            <Tooltip title="Ciutkan Sidebar (Collapse)" placement="bottom">
              <IconButton
                onClick={handleCollapse}
                aria-label="Ciutkan Sidebar"
                size="small"
                sx={{
                  color: '#475569',
                  width: 34,
                  height: 34,
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  bgcolor: '#ffffff',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: '#f8fafc',
                    color: '#1e293b',
                    borderColor: '#cbd5e1',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <MenuIcon size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Navigation Content */}
      <Box sx={{ flex: 1, py: 1.5, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* ============================================================ */}
        {/* Kategori 1: Human Resource System (SENDA Red Header)          */}
        {/* ============================================================ */}
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              color: '#dc2626', // Merah khas SENDA
              px: 2,
              pt: 1,
              pb: 0.75,
              display: 'block',
              textTransform: 'uppercase',
              fontSize: '0.75rem', // ~12px
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Human Resource System
          </Typography>
        )}

        {/* Collapsed Mode: Direct Icon List with Tooltips */}
        {collapsed ? (
          <List disablePadding>
            {driverAssessmentItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = isItemActive(item.href);

              return (
                <ListItem key={item.href} disablePadding sx={{ px: 1, mb: 0.5 }}>
                  <Tooltip title={item.label} placement="right">
                    <Link
                      href={item.href}
                      passHref
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                    >
                      <ListItemButton
                        onClick={onMobileClose}
                        selected={isActive}
                        sx={{
                          borderRadius: '6px',
                          minHeight: 42,
                          justifyContent: 'center',
                          px: 1,
                          bgcolor: isActive ? '#ffe4e6' : 'transparent',
                          '&:hover': {
                            bgcolor: isActive ? '#fecdd3' : '#f8fafc',
                          },
                          '&.Mui-selected': {
                            bgcolor: '#ffe4e6',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            justifyContent: 'center',
                            color: isActive ? '#dc2626' : '#475569',
                          }}
                        >
                          {Icon && <Icon size={20} />}
                        </ListItemIcon>
                      </ListItemButton>
                    </Link>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        ) : (
          /* Expanded Mode: Collapsible Group "Driver Assessment" */
          <Box sx={{ mb: 1 }}>
            {/* Parent Group Header Button */}
            <ListItem disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                onClick={() => setDriverAssessmentOpen((prev) => !prev)}
                sx={{
                  borderRadius: '6px',
                  minHeight: 40,
                  px: 1.5,
                  bgcolor: isDriverAssessmentActive && !driverAssessmentOpen ? '#fff1f2' : 'transparent',
                  '&:hover': {
                    bgcolor: '#f8fafc',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 32,
                    color: isDriverAssessmentActive ? '#dc2626' : '#475569',
                  }}
                >
                  <Car size={18} />
                </ListItemIcon>
                <ListItemText
                  primary="Driver Assessment"
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: isDriverAssessmentActive ? '#1e293b' : '#334155',
                  }}
                />
                {driverAssessmentOpen ? (
                  <ChevronDown size={16} color="#94a3b8" />
                ) : (
                  <ChevronRight size={16} color="#94a3b8" />
                )}
              </ListItemButton>
            </ListItem>

            {/* Nested Sub-Menu Items */}
            <Collapse in={driverAssessmentOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 2, pr: 1 }}>
                {driverAssessmentItems.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = isItemActive(item.href);

                  return (
                    <ListItem key={item.href} disablePadding sx={{ mb: 0.35 }}>
                      <Link
                        href={item.href}
                        passHref
                        style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                      >
                        <ListItemButton
                          onClick={onMobileClose}
                          selected={isActive}
                          sx={{
                            borderRadius: '6px',
                            minHeight: 38,
                            px: 1.5,
                            bgcolor: isActive ? '#ffe4e6' : 'transparent', // Pink lembut khas SENDA
                            border: isActive ? '1px solid #fecdd3' : '1px solid transparent',
                            '&:hover': {
                              bgcolor: isActive ? '#fecdd3' : '#f8fafc',
                            },
                            '&.Mui-selected': {
                              bgcolor: '#ffe4e6',
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 28,
                              color: isActive ? '#dc2626' : '#64748b',
                            }}
                          >
                            {Icon && <Icon size={16} />}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: '0.8125rem',
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? '#9f1239' : '#475569', // Merah tua saat aktif, abu-abu saat tidak aktif
                            }}
                          />
                        </ListItemButton>
                      </Link>
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        )}

        {/* ============================================================ */}
        {/* Kategori 2: Data Master / Settings (SENDA Red Header)         */}
        {/* ============================================================ */}
        <Divider sx={{ borderColor: '#e5e7eb', mx: 2, my: 1.5 }} />

        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              color: '#dc2626', // Merah khas SENDA
              px: 2,
              pt: 0.5,
              pb: 0.75,
              display: 'block',
              textTransform: 'uppercase',
              fontSize: '0.75rem', // ~12px
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Data Master & Settings
          </Typography>
        )}

        <List disablePadding sx={{ px: collapsed ? 1 : 1.5 }}>
          {settingsItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = isItemActive(item.href);

            return (
              <ListItem key={item.href} disablePadding sx={{ mb: 0.35 }}>
                {collapsed ? (
                  <Tooltip title={item.label} placement="right">
                    <Link
                      href={item.href}
                      passHref
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                    >
                      <ListItemButton
                        onClick={onMobileClose}
                        selected={isActive}
                        sx={{
                          borderRadius: '6px',
                          minHeight: 38,
                          justifyContent: 'center',
                          px: 1,
                          bgcolor: isActive ? '#ffe4e6' : 'transparent',
                          border: isActive ? '1px solid #fecdd3' : '1px solid transparent',
                          '&:hover': {
                            bgcolor: isActive ? '#fecdd3' : '#f8fafc',
                          },
                          '&.Mui-selected': {
                            bgcolor: '#ffe4e6',
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 0,
                            justifyContent: 'center',
                            color: isActive ? '#dc2626' : '#64748b',
                          }}
                        >
                          {Icon && <Icon size={18} />}
                        </ListItemIcon>
                      </ListItemButton>
                    </Link>
                  </Tooltip>
                ) : (
                  <Link
                    href={item.href}
                    passHref
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                  >
                    <ListItemButton
                      onClick={onMobileClose}
                      selected={isActive}
                      sx={{
                        borderRadius: '6px',
                        minHeight: 38,
                        justifyContent: 'flex-start',
                        px: 1.5,
                        bgcolor: isActive ? '#ffe4e6' : 'transparent',
                        border: isActive ? '1px solid #fecdd3' : '1px solid transparent',
                        '&:hover': {
                          bgcolor: isActive ? '#fecdd3' : '#f8fafc',
                        },
                        '&.Mui-selected': {
                          bgcolor: '#ffe4e6',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 30,
                          justifyContent: 'center',
                          color: isActive ? '#dc2626' : '#64748b',
                        }}
                      >
                        {Icon && <Icon size={18} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#9f1239' : '#475569',
                        }}
                      />
                    </ListItemButton>
                  </Link>
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer Info Area */}
      {!collapsed && (
        <Box
          sx={{
            p: 1.5,
            borderTop: '1px solid #e5e7eb',
            bgcolor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.6875rem', display: 'block' }}>
              SENDA &bull; SLEC v2.4
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>
              Driver Assessment Module
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1200,
          height: '100vh',
        }}
      >
        {sidebarContent}
      </Box>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <Box
            onClick={onMobileClose}
            sx={{
              display: { xs: 'block', md: 'none' },
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.4)',
              zIndex: 1199,
            }}
          />
          <Box
            component="nav"
            aria-label="Main navigation"
            sx={{
              display: { xs: 'block', md: 'none' },
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 1200,
              height: '100vh',
            }}
          >
            {sidebarContent}
          </Box>
        </>
      )}
    </>
  );
}
