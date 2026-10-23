'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Bell,
  Menu as MenuIcon,
  User,
} from 'lucide-react';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { tokens } from '@/lib/themeTokens';

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
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function Header({
  sidebarWidth,
  pageTitle = 'Dashboard',
  onMobileMenuOpen,
  onToggleSidebar,
  isSidebarCollapsed,
  isFullscreen: isFullscreenProp,
  onToggleFullscreen,
}: HeaderProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setInternalFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const isFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : internalFullscreen;

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setInternalFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setInternalFullscreen(false)).catch(() => {});
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (event.currentTarget) {
      setAnchorEl(event.currentTarget);
    }
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const markAllRead = () => {
    setNotifications([]);
  };

  const isMenuOpen = Boolean(anchorEl);

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: isFullscreen ? 0 : { xs: 0, md: `${sidebarWidth}px` },
        height: tokens.headerHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 3 },
        bgcolor: '#ffffff', // Background putih bersih khas SENDA
        borderBottom: '1px solid #e5e7eb', // Border bawah tipis
        zIndex: 1100,
        transition: 'left 0.2s ease',
      }}
    >
      {/* Left: Fullscreen Button + SENDA Breadcrumbs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Mobile menu trigger (hanya tampil pada layar smartphone sangat kecil) */}
        <IconButton
          aria-label="Buka navigasi mobile"
          onClick={onMobileMenuOpen}
          size="small"
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            color: '#475569',
            width: 36,
            height: 36,
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            bgcolor: '#ffffff',
            '&:hover': { bgcolor: '#f8fafc' },
          }}
        >
          <MenuIcon size={18} />
        </IconButton>

        {/* Tombol Perbesar Layar (Fullscreen) SENDA */}
        <Tooltip title={isFullscreen ? 'Keluar Layar Penuh' : 'Perbesar Layar'} placement="bottom">
          <IconButton
            aria-label="Perbesar Layar"
            onClick={toggleFullscreen}
            size="small"
            sx={{
              display: 'inline-flex',
              color: '#475569',
              width: 36,
              height: 36,
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              bgcolor: '#ffffff',
              transition: 'all 0.15s ease',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                bgcolor: '#f8fafc',
                color: '#1e293b',
                borderColor: '#cbd5e1',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            {isFullscreen ? (
              <FullscreenExitIcon sx={{ fontSize: 20 }} />
            ) : (
              <FullscreenIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Tooltip>

        {/* SENDA Breadcrumb & Page Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: { xs: 0.5, md: 1 } }}>
          <Typography
            sx={{
              color: '#dc2626', // Aksen Merah SENDA
              fontWeight: 700,
              fontSize: '0.8125rem',
              display: { xs: 'none', sm: 'inline-block' },
              letterSpacing: '0.04em',
            }}
          >
            SENDA
          </Typography>
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              display: { xs: 'none', sm: 'inline-block' },
            }}
          >
            /
          </Typography>
          <Typography
            sx={{
              color: '#64748b',
              fontSize: '0.8125rem',
              fontWeight: 500,
              display: { xs: 'none', md: 'inline-block' },
            }}
          >
            Human Resource
          </Typography>
          <Typography
            sx={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              display: { xs: 'none', md: 'inline-block' },
            }}
          >
            /
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: '#1e293b',
              fontSize: { xs: '1rem', md: '1.125rem' },
              lineHeight: 1.3,
            }}
          >
            {pageTitle}
          </Typography>
        </Box>
      </Box>

      {/* Right: Notifications + SUPERADMIN Profile */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Notifications */}
        <Tooltip title="Notifikasi Sistem">
          <IconButton
            aria-label={`Notifikasi – ${notifications.length} belum dibaca`}
            sx={{
              color: '#475569',
              p: 0.85,
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: '#f8fafc',
                color: '#1e293b',
                borderColor: '#cbd5e1',
              },
            }}
            size="small"
            onClick={handleMenuOpen}
          >
            <Badge
              badgeContent={notifications.length}
              invisible={notifications.length === 0}
              sx={{
                '& .MuiBadge-badge': {
                  bgcolor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  minWidth: 16,
                  height: 16,
                },
              }}
            >
              <Bell size={18} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={isMenuOpen && anchorEl !== null}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              width: 350,
              maxWidth: '100%',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Notifikasi
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
                visibility: notifications.length > 0 ? 'visible' : 'hidden',
              }}
              onClick={markAllRead}
            >
              Tandai semua dibaca
            </Typography>
          </Box>
          <Divider sx={{ borderColor: '#e5e7eb' }} />

          {notifications.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                Tidak ada notifikasi baru.
              </Typography>
            </Box>
          ) : (
            notifications.map((notif) => {
              const isError = notif.type === 'ERROR';
              const isWarning = notif.type === 'WARNING';
              const iconColor = isError ? '#ef4444' : isWarning ? '#f59e0b' : '#3b82f6';
              const bgIconColor = isError ? '#fee2e2' : isWarning ? '#fef3c7' : '#dbeafe';

              return (
                <MenuItem
                  key={notif.id}
                  onClick={handleMenuClose}
                  sx={{
                    px: 2,
                    py: 1.5,
                    alignItems: 'flex-start',
                    gap: 1.5,
                    borderBottom: '1px solid #f3f4f6',
                    '&:hover': { bgcolor: '#f8fafc' },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: bgIconColor,
                      color: iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 0.25,
                    }}
                  >
                    {isError && <ErrorOutlineIcon sx={{ fontSize: 18 }} />}
                    {isWarning && <WarningAmberIcon sx={{ fontSize: 18 }} />}
                    {!isError && !isWarning && <InfoOutlinedIcon sx={{ fontSize: 18 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.25, lineHeight: 1.2 }}>
                      {notif.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.75rem', lineHeight: 1.4, mb: 0.5, whiteSpace: 'normal' }}>
                      {notif.desc}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                      {notif.time}
                    </Typography>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Menu>

        {/* SENDA Superadmin User Profile Section */}
        <Tooltip title="Profil Pengguna - SUPERADMIN SLEC">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              cursor: 'pointer',
              borderRadius: '8px',
              p: 0.5,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: '#f8fafc' },
            }}
            role="button"
            tabIndex={0}
            aria-label="Menu profil user"
          >
            {/* Teks Nama & Role Rata Kanan */}
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  lineHeight: 1.25,
                  letterSpacing: '0.01em',
                }}
              >
                ADMIN SLEC
              </Typography>
              <Typography
                sx={{
                  color: '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  lineHeight: 1.2,
                }}
              >
                CCR / Management
              </Typography>
            </Box>

            {/* Avatar Kotak Abu-Abu Muda persis style SUPERADMIN SENDA */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '6px', // Kotak ber-radius 6px khas SENDA
                bgcolor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  bgcolor: '#e2e8f0',
                },
              }}
            >
              <User size={18} color="#475569" />
            </Box>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
