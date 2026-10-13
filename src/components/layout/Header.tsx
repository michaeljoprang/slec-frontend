'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Bell, Menu as MenuIcon } from 'lucide-react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { tokens } from '@/lib/theme';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'ERROR',
    title: 'Pelanggaran Fatal',
    desc: 'Udin (Sanyang) diskualifikasi: Menabrak safety cone.',
    time: '5 mnt lalu'
  },
  {
    id: 2,
    type: 'WARNING',
    title: 'SIM Kedaluwarsa',
    desc: 'SIM B milik Budi akan habis dalam 30 hari.',
    time: '2 jam lalu'
  },
  {
    id: 3,
    type: 'INFO',
    title: 'Pengajuan Revisi',
    desc: 'Trainer Michael meminta akses edit data Udin.',
    time: '1 hari lalu'
  }
];

interface HeaderProps {
  sidebarWidth: number;
  pageTitle?: string;
  onMobileMenuOpen: () => void;
}

export default function Header({ sidebarWidth, pageTitle = 'Dashboard', onMobileMenuOpen }: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const markAllRead = () => {
    setNotifications([]);
  };

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: { xs: 0, md: `${sidebarWidth}px` },
        height: tokens.headerHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 3 },
        bgcolor: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        zIndex: 1100,
        transition: 'left 0.2s ease',
      }}
    >
      {/* Left: mobile menu + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton
          aria-label="Open navigation menu"
          onClick={onMobileMenuOpen}
          sx={{ display: { xs: 'flex', md: 'none' }, color: tokens.colors.text.primary }}
        >
          <MenuIcon size={22} />
        </IconButton>
        <Typography variant="h3" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          {pageTitle}
        </Typography>
      </Box>

      {/* Right: notifications + profile */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            aria-label="Notifications – 3 unread"
            sx={{ color: tokens.colors.text.secondary }}
            onClick={handleMenuOpen}
          >
            <Badge
              badgeContent={notifications.length}
              invisible={notifications.length === 0}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: tokens.colors.status.danger,
                  color: '#fff',
                  fontSize: '0.625rem',
                  minWidth: 18,
                  height: 18,
                },
              }}
            >
              <Bell size={20} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 8,
            sx: {
              mt: 1.5,
              width: 350,
              maxWidth: '100%',
              borderRadius: `${tokens.borderRadius.md}px`,
              border: `1px solid ${tokens.colors.border}`,
              boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.08)',
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
              Notifikasi
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.colors.primaryLight, cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' }, visibility: notifications.length > 0 ? 'visible' : 'hidden' }}
              onClick={markAllRead}
            >
              Tandai semua dibaca
            </Typography>
          </Box>
          <Divider />
          
          {notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, fontWeight: 500 }}>
                Tidak ada notifikasi baru.
              </Typography>
            </Box>
          ) : (
            notifications.map((notif) => {
              const isError = notif.type === 'ERROR';
              const isWarning = notif.type === 'WARNING';
              const iconColor = isError ? tokens.colors.status.danger : isWarning ? tokens.colors.status.warning : tokens.colors.primaryLight;
              const bgIconColor = isError ? tokens.colors.status.dangerBg : isWarning ? tokens.colors.status.warningBg : tokens.colors.status.infoBg;
              
              return (
                <MenuItem
                  key={notif.id}
                  onClick={handleMenuClose}
                  sx={{
                    px: 2,
                    py: 1.5,
                    alignItems: 'flex-start',
                    gap: 1.5,
                    borderBottom: `1px solid ${tokens.colors.borderLight}`,
                    '&:hover': { bgcolor: tokens.colors.surfaceHover },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: bgIconColor,
                      color: iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 0.25,
                    }}
                  >
                    {isError && <ErrorOutlineIcon fontSize="small" />}
                    {isWarning && <WarningAmberIcon fontSize="small" />}
                    {!isError && !isWarning && <InfoOutlinedIcon fontSize="small" />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.colors.text.primary, mb: 0.5, lineHeight: 1.2 }}>
                      {notif.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, fontSize: '0.75rem', lineHeight: 1.4, mb: 0.75, whiteSpace: 'normal' }}>
                      {notif.desc}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary, fontSize: '0.65rem' }}>
                      {notif.time}
                    </Typography>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Menu>

        {/* Profile */}
        <Tooltip title="User profile – Admin">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 1,
              cursor: 'pointer',
              borderRadius: `${tokens.borderRadius.sm}px`,
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: tokens.colors.surfaceHover },
            }}
            role="button"
            tabIndex={0}
            aria-label="User profile menu"
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: tokens.colors.primary,
                fontSize: '0.8125rem',
                fontWeight: 600,
              }}
            >
              AF
            </Avatar>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: tokens.colors.text.primary, lineHeight: 1.3 }}
              >
                Admin SLEC
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: tokens.colors.text.tertiary, lineHeight: 1.2 }}
              >
                CCR / Management
              </Typography>
            </Box>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
