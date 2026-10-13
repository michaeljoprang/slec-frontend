'use client';

import React from 'react';
import { Paper, Box, Typography, Divider } from '@mui/material';
import { tokens } from '@/lib/theme';
import type { DDTScoreResult } from '@/lib/assessment';

interface AssessmentScoreSummaryProps {
  scoreResult: DDTScoreResult;
  sticky?: boolean;
}

export default function AssessmentScoreSummary({ scoreResult, sticky }: AssessmentScoreSummaryProps) {
  const { totalPoint, totalDeduction, actual, score, result } = scoreResult;
  const isPassing = result === 'PASS';

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.5 },
        ...(sticky ? { position: 'sticky', top: tokens.headerHeight + 8, zIndex: 10 } : {}),
        border: `2px solid ${isPassing ? tokens.colors.status.success + '60' : tokens.colors.status.danger + '60'}`,
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: tokens.colors.text.primary, mb: 1.5, fontSize: '0.9375rem' }}
      >
        Live Score
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ScoreRow label="Total Point" value={totalPoint} />
        <ScoreRow label="Total Deduction" value={`-${totalDeduction}`} danger={totalDeduction > 0} />
        <Divider sx={{ my: 0.5 }} />
        <ScoreRow label="Actual" value={actual} bold />
        <ScoreRow label="Score" value={`${score.toFixed(1)}`} bold />
      </Box>

      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: `${tokens.borderRadius.md}px`,
          bgcolor: isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.25rem',
            color: isPassing ? tokens.colors.status.success : tokens.colors.status.danger,
            letterSpacing: '0.05em',
          }}
        >
          {result}
        </Typography>
        <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
          {isPassing ? 'Minimum lulus: 70' : 'Di bawah minimum: 70'}
        </Typography>
      </Box>
    </Paper>
  );
}

function ScoreRow({
  label,
  value,
  bold,
  danger,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography
        variant="body2"
        sx={{ color: tokens.colors.text.secondary, fontWeight: bold ? 600 : 400 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: bold ? 700 : 500,
          color: danger
            ? tokens.colors.status.danger
            : bold
            ? tokens.colors.text.primary
            : tokens.colors.text.primary,
          fontSize: bold ? '0.9375rem' : '0.875rem',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
