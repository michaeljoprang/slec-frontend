'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { tokens } from '@/lib/theme';
import type { MonitoringTrendItem } from '@/types/monitoring';

interface MonitoringTrendChartProps {
  data: MonitoringTrendItem[];
}

export default function MonitoringTrendChart({ data }: MonitoringTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
          No trend data available.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: tokens.colors.text.primary }}>
        Assessment Trend
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.colors.borderLight} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: tokens.colors.text.secondary, fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tokens.colors.text.secondary, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: tokens.colors.surfaceHover }}
              contentStyle={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.borderRadius.sm,
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              itemStyle={{ color: tokens.colors.text.primary, fontWeight: 600 }}
              labelStyle={{ color: tokens.colors.text.secondary, marginBottom: 4 }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            <Bar
              dataKey="pass"
              name="Pass"
              stackId="a"
              fill={tokens.colors.status.success}
              radius={[0, 0, 0, 0]}
              barSize={40}
            />
            <Bar
              dataKey="fail"
              name="Fail"
              stackId="a"
              fill={tokens.colors.status.danger}
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
