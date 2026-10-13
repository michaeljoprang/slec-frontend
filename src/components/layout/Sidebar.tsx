'use client';

import React from 'react';
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
} from '@mui/material';
import {
  LayoutDashboard,
  ClipboardCheck,
  History,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { NavItem } from '@/types';

// Icon mapping so we can reference icons by string name
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ClipboardCheck,
  History,
  FileBarChart,
  Settings,
};


const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'New Assessment', href: '/assessment/new', icon: 'ClipboardCheck' },
  { label: 'Assessment History', href: '/assessment/history', icon: 'History' },
  { label: 'Monitoring', href: '/monitoring', icon: 'FileBarChart' },
  { label: 'Reports', href: '/reports', icon: 'FileBarChart' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const width = collapsed ? tokens.sidebarCollapsedWidth : tokens.sidebarWidth;

  const sidebarContent = (
    <Box
      sx={{
        width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: tokens.colors.sidebar.bg,
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Logo Area */}
      <Box
        sx={{
          height: tokens.headerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2.5,
          borderBottom: `1px solid ${tokens.colors.sidebar.border}`,
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: tokens.borderRadius.sm,
                background: `linear-gradient(135deg, ${tokens.colors.primaryLight}, ${tokens.colors.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ClipboardCheck size={18} color="#fff" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                color: tokens.colors.sidebar.textActive,
                fontWeight: 700,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              SLEC
            </Typography>
          </Box>
        )}
        <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <IconButton
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            sx={{
              color: tokens.colors.sidebar.text,
              '&:hover': { bgcolor: tokens.colors.sidebar.hoverItemBg },
            }}
            size="small"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              color: tokens.colors.sidebar.text,
              px: 2.5,
              py: 1,
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              opacity: 0.6,
            }}
          >
            Main Menu / Assessment
          </Typography>
        )}
        <List disablePadding>
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <ListItem key={item.href} disablePadding sx={{ px: 1, mb: 0.25 }}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <Link href={item.href} passHref style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <ListItemButton
                      onClick={onMobileClose}
                    selected={isActive}
                    sx={{
                      borderRadius: `${tokens.borderRadius.sm}px`,
                      minHeight: 44,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1.5 : 2,
                      bgcolor: isActive ? tokens.colors.sidebar.activeItemBg : 'transparent',
                      '&:hover': {
                        bgcolor: isActive
                          ? tokens.colors.sidebar.activeItemBg
                          : tokens.colors.sidebar.hoverItemBg,
                      },
                      '&.Mui-selected': {
                        bgcolor: tokens.colors.sidebar.activeItemBg,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 36,
                        justifyContent: 'center',
                        color: isActive
                          ? tokens.colors.primaryLight
                          : tokens.colors.sidebar.text,
                      }}
                    >
                      {Icon && <Icon size={20} />}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive
                            ? tokens.colors.sidebar.textActive
                            : tokens.colors.sidebar.text,
                        }}
                      />
                    )}
                    {!collapsed && item.badge && (
                      <Box
                        sx={{
                          bgcolor: tokens.colors.status.danger,
                          color: '#fff',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          borderRadius: '10px',
                          px: 0.8,
                          py: 0.15,
                          minWidth: 20,
                          textAlign: 'center',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.badge}
                      </Box>
                    )}
                    </ListItemButton>
                  </Link>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Bottom Section */}
      <Box sx={{ flexShrink: 0, pb: 1 }}>
        <Divider sx={{ borderColor: tokens.colors.sidebar.border, mx: 2, mb: 1 }} />
        <List disablePadding>
          {bottomNavItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;

            return (
              <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <Link href={item.href} passHref style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <ListItemButton
                      onClick={onMobileClose}
                    selected={isActive}
                    sx={{
                      borderRadius: `${tokens.borderRadius.sm}px`,
                      minHeight: 44,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1.5 : 2,
                      bgcolor: isActive ? tokens.colors.sidebar.activeItemBg : 'transparent',
                      '&:hover': {
                        bgcolor: tokens.colors.sidebar.hoverItemBg,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: collapsed ? 0 : 36,
                        justifyContent: 'center',
                        color: isActive
                          ? tokens.colors.primaryLight
                          : tokens.colors.sidebar.text,
                      }}
                    >
                      {Icon && <Icon size={20} />}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive
                            ? tokens.colors.sidebar.textActive
                            : tokens.colors.sidebar.text,
                        }}
                      />
                    )}
                    </ListItemButton>
                  </Link>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>
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
              bgcolor: 'rgba(0,0,0,0.5)',
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
