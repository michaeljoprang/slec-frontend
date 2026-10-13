'use client';

import React from 'react';
import { Box, Grid, Paper, Skeleton } from '@mui/material';

export function MonitoringKpiSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <Paper sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Skeleton variant="rounded" width={44} height={44} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={32} />
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

export function MonitoringChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <Paper sx={{ p: 3, height }}>
      <Skeleton variant="text" width="35%" height={28} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" height={height - 80} />
    </Paper>
  );
}

export function MonitoringTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 0.75 }} />
      ))}
    </Paper>
  );
}
