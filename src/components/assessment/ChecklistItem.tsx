'use client';

import React from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material';
import { CheckCircle2, XCircle } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { ChecklistAnswer } from '@/lib/assessment';

interface ChecklistItemProps {
  id: string;
  description: string;
  deductionPoint: number;
  answer: ChecklistAnswer;
  onChange: (id: string, answer: ChecklistAnswer) => void;
  index: number;
}

export default function ChecklistItem({
  id,
  description,
  deductionPoint,
  answer,
  onChange,
  index,
}: ChecklistItemProps) {
  const isYes = answer === 'YES';
  const isNo = answer === 'NO';

  const rowBg = isNo
    ? 'rgba(239,68,68,0.05)'
    : isYes
    ? 'rgba(16,185,129,0.04)'
    : tokens.colors.surface;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: { xs: 1.5, sm: 2 },
        borderRadius: `${tokens.borderRadius.md}px`,
        border: `1px solid ${
          isNo
            ? tokens.colors.status.danger + '40'
            : isYes
            ? tokens.colors.status.success + '40'
            : tokens.colors.border
        }`,
        bgcolor: rowBg,
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Index */}
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: tokens.colors.borderLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.colors.text.secondary }}>
          {index}
        </Typography>
      </Box>

      {/* Description */}
      <Typography
        variant="body1"
        sx={{
          flex: 1,
          color: tokens.colors.text.primary,
          fontSize: { xs: '0.875rem', sm: '0.9375rem' },
          lineHeight: 1.5,
        }}
      >
        {description}
      </Typography>

      {/* Deduction badge */}
      <Chip
        label={`-${deductionPoint} pt`}
        size="small"
        sx={{
          bgcolor: isNo ? tokens.colors.status.dangerBg : tokens.colors.borderLight,
          color: isNo ? tokens.colors.status.danger : tokens.colors.text.tertiary,
          fontWeight: 600,
          fontSize: '0.75rem',
          flexShrink: 0,
          display: { xs: 'none', sm: 'flex' },
        }}
      />

      {/* YES / NO toggle */}
      <ToggleButtonGroup
        exclusive
        value={answer}
        onChange={(_e, val) => {
          if (val !== null) onChange(id, val as ChecklistAnswer);
        }}
        size="small"
        sx={{ flexShrink: 0 }}
      >
        <ToggleButton
          value="YES"
          aria-label="Yes"
          sx={{
            minWidth: { xs: 64, sm: 72 },
            height: 48,
            fontWeight: 700,
            fontSize: '0.875rem',
            gap: 0.5,
            color: isYes ? '#fff' : tokens.colors.status.success,
            bgcolor: isYes ? `${tokens.colors.status.success} !important` : 'transparent',
            borderColor: `${tokens.colors.status.success} !important`,
            '&:hover': {
              bgcolor: isYes
                ? tokens.colors.status.success
                : `${tokens.colors.status.success}15`,
            },
          }}
        >
          <CheckCircle2 size={16} />
          YES
        </ToggleButton>
        <ToggleButton
          value="NO"
          aria-label="No"
          sx={{
            minWidth: { xs: 64, sm: 72 },
            height: 48,
            fontWeight: 700,
            fontSize: '0.875rem',
            gap: 0.5,
            color: isNo ? '#fff' : tokens.colors.status.danger,
            bgcolor: isNo ? `${tokens.colors.status.danger} !important` : 'transparent',
            borderColor: `${tokens.colors.status.danger} !important`,
            '&:hover': {
              bgcolor: isNo
                ? tokens.colors.status.danger
                : `${tokens.colors.status.danger}15`,
            },
          }}
        >
          <XCircle size={16} />
          NO
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
