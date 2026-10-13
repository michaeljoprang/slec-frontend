import React from 'react';
import { Chip } from '@mui/material';
import { tokens } from '@/lib/theme';

interface ResultBadgeProps {
  result: 'PASS' | 'FAIL';
}

export default function ResultBadge({ result }: ResultBadgeProps) {
  const isPassing = result === 'PASS';
  return (
    <Chip
      label={result}
      size="small"
      sx={{
        bgcolor: isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg,
        color: isPassing ? tokens.colors.status.success : tokens.colors.status.danger,
        fontWeight: 700,
        fontSize: '0.75rem',
      }}
    />
  );
}
