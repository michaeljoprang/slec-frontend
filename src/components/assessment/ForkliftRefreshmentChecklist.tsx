import React from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import type { ForkliftRefreshmentSection } from '@/features/assessment/forkliftRefreshment';

interface Props {
  section: ForkliftRefreshmentSection;
  frequencies: Record<string, number>;
  onChange: (itemId: string, frequency: number) => void;
}

export default function ForkliftRefreshmentChecklist({ section, frequencies, onChange }: Props) {
  return (
    <Paper sx={{ borderRadius: `${tokens.borderRadius.lg}px`, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: tokens.colors.primary, color: '#fff' }}>
        <Typography variant="h3" sx={{ fontWeight: 600 }}>{section.name}</Typography>
      </Box>
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 2,
          p: { xs: 2, sm: 2.5 },
          bgcolor: tokens.colors.borderLight,
          borderBottom: `1px solid ${tokens.colors.border}`,
        }}
      >
        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontWeight: 700, color: tokens.colors.text.secondary }}>
          Item Penilaian
        </Typography>
        <Typography variant="caption" sx={{ width: 70, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>
          Bobot
        </Typography>
        <Typography variant="caption" sx={{ width: 70, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>
          Plan
        </Typography>
        <Typography variant="caption" sx={{ width: 130, textAlign: 'center', display: 'flex', justifyContent: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>
          Frekuensi
        </Typography>
        <Typography variant="caption" sx={{ width: 90, textAlign: 'right', fontWeight: 700, color: tokens.colors.text.secondary }}>
          Deduction
        </Typography>
      </Box>
      {section.items.map((item, index) => {
        const frequency = Math.min(item.plan, Math.max(0, frequencies[item.id] || 0));
        return (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: { xs: 2, sm: 2.5 },
              borderBottom: index < section.items.length - 1 ? `1px solid ${tokens.colors.border}` : 'none',
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ display: { xs: 'block', sm: 'none' }, color: tokens.colors.text.secondary, mt: 0.5 }}>
                Bobot: {item.deduction} · Plan: {item.plan}
              </Typography>
            </Box>
            <Typography sx={{ width: 70, textAlign: 'center', display: { xs: 'none', sm: 'block' }, fontWeight: 500, color: tokens.colors.text.secondary }}>
              {item.deduction}
            </Typography>
            <Typography sx={{ width: 70, textAlign: 'center', display: { xs: 'none', sm: 'block' }, fontWeight: 500, color: tokens.colors.text.secondary }}>
              {item.plan}
            </Typography>
            <Box sx={{ width: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <IconButton
                onClick={() => onChange(item.id, Math.max(0, frequency - 1))}
                disabled={frequency === 0}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: tokens.colors.borderLight,
                  border: `1px solid ${tokens.colors.border}`,
                  '&:hover': { bgcolor: tokens.colors.border },
                }}
              >
                <Minus size={16} />
              </IconButton>
              <Typography variant="body1" sx={{ width: 28, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.primary }}>
                {frequency}
              </Typography>
              <IconButton
                onClick={() => onChange(item.id, Math.min(item.plan, frequency + 1))}
                disabled={frequency >= item.plan}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: tokens.colors.borderLight,
                  border: `1px solid ${tokens.colors.border}`,
                  '&:hover': { bgcolor: tokens.colors.border },
                }}
              >
                <Plus size={16} />
              </IconButton>
            </Box>
            <Typography
              sx={{
                width: 90,
                textAlign: 'right',
                fontWeight: 700,
                color: frequency > 0 ? tokens.colors.status.danger : tokens.colors.text.tertiary,
              }}
            >
              {frequency > 0 ? `-${frequency * item.deduction}` : '-'}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
}
