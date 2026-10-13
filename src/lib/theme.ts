// ============================================================
// SLEC – MUI Theme Configuration
// ============================================================

import { createTheme } from '@mui/material/styles';

/**
 * Design tokens for the SLEC application.
 * Extracted here so they can be referenced outside MUI components.
 */
export const tokens = {
  sidebarWidth: 260,
  sidebarCollapsedWidth: 72,
  headerHeight: 64,
  colors: {
    primary: '#1e40af',       // Deep blue
    primaryLight: '#3b82f6',
    primaryDark: '#1e3a8a',
    secondary: '#0f766e',     // Teal
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
    },
    status: {
      success: '#10b981',
      successBg: '#d1fae5',
      warning: '#f59e0b',
      warningBg: '#fef3c7',
      danger: '#ef4444',
      dangerBg: '#fee2e2',
      info: '#3b82f6',
      infoBg: '#dbeafe',
    },
    sidebar: {
      bg: '#0f172a',
      text: '#cbd5e1',
      textActive: '#ffffff',
      activeItemBg: 'rgba(59, 130, 246, 0.15)',
      hoverItemBg: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.08)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
  },
} as const;

const theme = createTheme({
  palette: {
    primary: {
      main: tokens.colors.primary,
      light: tokens.colors.primaryLight,
      dark: tokens.colors.primaryDark,
    },
    secondary: {
      main: tokens.colors.secondary,
    },
    background: {
      default: tokens.colors.background,
      paper: tokens.colors.surface,
    },
    text: {
      primary: tokens.colors.text.primary,
      secondary: tokens.colors.text.secondary,
    },
    success: { main: tokens.colors.status.success },
    warning: { main: tokens.colors.status.warning },
    error: { main: tokens.colors.status.danger },
    info: { main: tokens.colors.status.info },
  },
  typography: {
    fontFamily: '"Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.3 },
    h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
  },
  shape: {
    borderRadius: tokens.borderRadius.md,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.colors.background,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: tokens.borderRadius.sm,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: tokens.borderRadius.lg,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: tokens.colors.border,
          fontSize: '0.8125rem',
        },
        head: {
          fontWeight: 600,
          color: tokens.colors.text.secondary,
          backgroundColor: tokens.colors.borderLight,
        },
      },
    },
  },
});

export default theme;
