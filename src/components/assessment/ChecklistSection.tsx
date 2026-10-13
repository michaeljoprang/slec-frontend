'use client';

import React from 'react';
import { Box, Paper, Typography, LinearProgress, Chip, Button } from '@mui/material';
import { tokens } from '@/lib/theme';
import type { AssessmentSection, AnswerMap, ChecklistAnswer } from '@/lib/assessment';
import ChecklistItem from './ChecklistItem';

interface ChecklistSectionProps {
  section: AssessmentSection;
  answers: AnswerMap;
  onChange: (id: string, answer: ChecklistAnswer) => void;
  assessmentType?: string;
}

export default function ChecklistSection({ section, answers, onChange, assessmentType = 'DDT' }: ChecklistSectionProps) {
  const answered = section.items.filter((item) => answers[item.id] !== null && answers[item.id] !== undefined).length;
  const total = section.items.length;
  const deduction = section.items.reduce(
    (sum, item) => sum + (answers[item.id] === 'NO' ? item.deductionPoint : 0),
    0,
  );
  const progress = total > 0 ? (answered / total) * 100 : 0;

  const handleFillRestYes = () => {
    section.items.forEach((item) => {
      const currentAnswer = answers[item.id];
      if (currentAnswer === null || currentAnswer === undefined) {
        onChange(item.id, 'YES');
      }
    });
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ color: tokens.colors.text.primary, fontWeight: 700 }}>
            {section.label}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.25 }}>
            {answered}/{total} item terjawab &bull; Poin seksi: {section.totalPoint}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {assessmentType === 'DDT' && answered < total && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleFillRestYes}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: tokens.colors.border,
                color: tokens.colors.text.secondary,
                '&:hover': {
                  borderColor: tokens.colors.primaryLight,
                  color: tokens.colors.primaryLight,
                  bgcolor: 'transparent',
                },
              }}
            >
              Isi Sisanya YES
            </Button>
          )}
          {deduction > 0 && (
            <Chip
              label={`Deduction: -${deduction}`}
              size="small"
              sx={{ bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, fontWeight: 700 }}
            />
          )}
          <Chip
            label={`${answered}/${total}`}
            size="small"
            sx={{
              bgcolor: answered === total ? tokens.colors.status.successBg : tokens.colors.borderLight,
              color: answered === total ? tokens.colors.status.success : tokens.colors.text.secondary,
              fontWeight: 600,
            }}
          />
        </Box>
      </Box>

      {/* Progress */}
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          borderRadius: 2,
          mb: 2.5,
          bgcolor: tokens.colors.borderLight,
          '& .MuiLinearProgress-bar': {
            bgcolor: answered === total ? tokens.colors.status.success : tokens.colors.primaryLight,
            borderRadius: 2,
          },
        }}
      />

      {/* Items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {section.items.map((item, idx) => (
          <ChecklistItem
            key={item.id}
            id={item.id}
            description={item.description}
            deductionPoint={item.deductionPoint}
            answer={answers[item.id] ?? null}
            onChange={onChange}
            index={idx + 1}
          />
        ))}
      </Box>
    </Paper>
  );
}
