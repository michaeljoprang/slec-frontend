'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '@/lib/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2,
      }}
    >
      <Box>
        <Typography variant="h4" sx={{ color: tokens.colors.text.primary }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
