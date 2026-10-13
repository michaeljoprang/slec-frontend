'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { AssessmentSection, AnswerMap } from '@/lib/assessment';

interface AssessmentProgressProps {
  sections: AssessmentSection[];
  currentSectionIndex: number;
  answers: AnswerMap;
  onSectionClick?: (index: number) => void;
}

export default function AssessmentProgress({
  sections,
  currentSectionIndex,
  answers,
  onSectionClick,
}: AssessmentProgressProps) {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5, color: tokens.colors.text.primary }}>
        Progress Penilaian
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {sections.map((section, idx) => {
          const answered = section.items.filter(
            (item) => answers[item.id] !== null && answers[item.id] !== undefined,
          ).length;
          const isComplete = answered === section.items.length;
          const isCurrent = idx === currentSectionIndex;

          const Icon = isComplete ? CheckCircle2 : isCurrent ? Clock : Circle;
          const iconColor = isComplete
            ? tokens.colors.status.success
            : isCurrent
            ? tokens.colors.primaryLight
            : tokens.colors.text.tertiary;

          return (
            <Box
              key={section.id}
              onClick={() => onSectionClick?.(idx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: `${tokens.borderRadius.sm}px`,
                cursor: onSectionClick ? 'pointer' : 'default',
                bgcolor: isCurrent ? tokens.colors.status.infoBg : 'transparent',
                border: `1px solid ${isCurrent ? tokens.colors.primaryLight + '40' : 'transparent'}`,
                '&:hover': onSectionClick
                  ? { bgcolor: isCurrent ? tokens.colors.status.infoBg : tokens.colors.surfaceHover }
                  : {},
              }}
            >
              <Icon size={18} color={iconColor} />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCurrent ? tokens.colors.text.primary : tokens.colors.text.secondary,
                    fontSize: '0.8125rem',
                  }}
                >
                  {section.label}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: isComplete ? tokens.colors.status.success : tokens.colors.text.tertiary,
                  fontWeight: isComplete ? 600 : 400,
                }}
              >
                {answered}/{section.items.length}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
