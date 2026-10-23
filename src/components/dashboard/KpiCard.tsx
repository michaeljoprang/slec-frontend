'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Camera,
  Minus,
} from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import type { KpiItem } from '@/types';

const lucideIconMap: Record<string, React.ElementType> = {
  Shield,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Camera,
};

const intentColors: Record<string, { bg: string; icon: string }> = {
  success: { bg: tokens.colors.status.successBg, icon: tokens.colors.status.success },
  warning: { bg: tokens.colors.status.warningBg, icon: tokens.colors.status.warning },
  danger: { bg: tokens.colors.status.dangerBg, icon: tokens.colors.status.danger },
  info: { bg: tokens.colors.status.infoBg, icon: tokens.colors.status.info },
  neutral: { bg: tokens.colors.borderLight, icon: tokens.colors.text.secondary },
};

interface KpiCardProps {
  data: KpiItem;
}

export default function KpiCard({ data }: KpiCardProps) {
  const { label, value, change, changeDirection, intent = 'neutral', icon } = data;
  const colors = intentColors[intent];
  const Icon = icon ? lucideIconMap[icon] : null;

  const ChangeIcon =
    changeDirection === 'up' ? TrendingUp : changeDirection === 'down' ? TrendingDown : Minus;

  const changeColor =
    intent === 'danger' || intent === 'warning'
      ? changeDirection === 'down'
        ? tokens.colors.status.success
        : tokens.colors.status.danger
      : changeDirection === 'up'
        ? tokens.colors.status.success
        : changeDirection === 'down'
          ? tokens.colors.status.danger
          : tokens.colors.text.tertiary;

  return (
    <Paper
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        transition: 'box-shadow 0.15s ease',
        '&:hover': {
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: `${tokens.borderRadius.sm}px`,
          bgcolor: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {Icon && <Icon size={22} color={colors.icon} />}
      </Box>

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: tokens.colors.text.secondary,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            display: 'block',
            mb: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            color: tokens.colors.text.primary,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>

        {change !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
            <ChangeIcon size={14} color={changeColor} />
            <Typography
              variant="caption"
              sx={{
                color: changeColor,
                fontWeight: 600,
              }}
            >
              {Math.abs(change)}%
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
              vs last month
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
