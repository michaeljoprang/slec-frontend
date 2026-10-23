import React from 'react';
import { Chip } from '@mui/material';
import { tokens } from '@/lib/themeTokens';

interface ResultBadgeProps {
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED' | 'IN_PROGRESS' | 'DRAFT' | string;
}

export default function ResultBadge({ result }: ResultBadgeProps) {
  const cleanResult = (result || '').toUpperCase().trim();
  const isPass = cleanResult === 'PASS';
  const isFail = cleanResult === 'FAIL';
  const isDisqualified = cleanResult === 'DISQUALIFIED';
  const isInProgress = cleanResult === 'IN_PROGRESS';
  const isDraft = cleanResult === 'DRAFT';

  let bgcolor: string = tokens.colors.borderLight;
  let color: string = tokens.colors.text.secondary;
  let label: string = result || '—';

  if (isPass) {
    bgcolor = tokens.colors.status.successBg;
    color = tokens.colors.status.success;
    label = 'PASS';
  } else if (isFail) {
    bgcolor = tokens.colors.status.dangerBg;
    color = tokens.colors.status.danger;
    label = 'FAIL';
  } else if (isDisqualified) {
    bgcolor = tokens.colors.status.warningBg;
    color = tokens.colors.status.warning;
    label = 'DISQUALIFIED';
  } else if (isInProgress) {
    bgcolor = 'rgba(59, 130, 246, 0.12)';
    color = tokens.colors.primaryLight;
    label = 'IN PROGRESS';
  } else if (isDraft) {
    bgcolor = 'rgba(100, 116, 139, 0.12)';
    color = '#64748b';
    label = 'DRAFT';
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor,
        color,
        fontWeight: 800,
        fontSize: '0.75rem',
      }}
    />
  );
}
