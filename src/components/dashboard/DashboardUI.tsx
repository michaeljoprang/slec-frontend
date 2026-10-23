'use client';

import { Box, Typography } from '@mui/material';
import AppShell from '@/components/layout/AppShell';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { tokens } from '@/lib/themeTokens';

interface DashboardUIProps {
  trend: { month: string; pass: number; fail: number }[];
  distribution: { name: string; value: number; color: string }[];
}

export default function DashboardUI({ trend, distribution }: DashboardUIProps) {
  return (
    <AppShell pageTitle="Dashboard Overview">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Typography variant="h2" sx={{ fontWeight: 800, color: tokens.colors.text.primary, mb: 3 }}>
          Dashboard Overview
        </Typography>
        <DashboardCharts trend={trend} distribution={distribution} />
      </Box>
    </AppShell>
  );
}
