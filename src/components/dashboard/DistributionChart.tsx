'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { tokens } from '@/lib/theme';
import type { DistributionData } from '@/types';

interface DistributionChartProps {
  title: string;
  data: DistributionData;
  type?: 'pie' | 'donut';
}

export default function DistributionChart({ title, data, type = 'donut' }: DistributionChartProps) {
  const innerRadius = type === 'donut' ? '60%' : 0;

  return (
    <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: tokens.colors.text.primary }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.data}
              cx="50%"
              cy="45%"
              innerRadius={innerRadius}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || tokens.colors.primary} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.borderRadius.sm,
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              itemStyle={{ color: tokens.colors.text.primary, fontWeight: 600 }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '0.8125rem', color: tokens.colors.text.secondary }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
