'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { tokens } from '@/lib/themeTokens';
import type { AssessmentTrendData } from '@/types';

interface AssessmentTrendChartProps {
  data: AssessmentTrendData;
}

export default function AssessmentTrendChart({ data }: AssessmentTrendChartProps) {
  return (
    <Paper sx={{ p: 3, height: 360, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: tokens.colors.text.primary }}>
        Assessment Trend
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.assessments} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tokens.colors.primary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={tokens.colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.colors.borderLight} />
            <XAxis
              dataKey="date"
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
              contentStyle={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.borderRadius.sm,
                border: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
              itemStyle={{ color: tokens.colors.text.primary, fontWeight: 600 }}
              labelStyle={{ color: tokens.colors.text.secondary, marginBottom: 4 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Assessments"
              stroke={tokens.colors.primary}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorAssessments)"
              activeDot={{ r: 6, fill: tokens.colors.primary, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
