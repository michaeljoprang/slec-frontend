// ============================================================
// SLEC – MUI Theme Configuration
// ============================================================

import { createTheme } from '@mui/material/styles';

import { tokens } from './themeTokens';

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
    fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          backgroundColor: '#f9fafb',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
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
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
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
