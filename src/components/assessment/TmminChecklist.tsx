import React from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { tokens } from '@/lib/theme';
import { TmminSection, TmminChecklistItem } from '@/features/assessment/tmmin';

interface TmminChecklistProps {
  section: TmminSection;
  frequencies: Record<string, number>;
  onChange: (itemId: string, frequency: number) => void;
}

export default function TmminChecklist({ section, frequencies, onChange }: TmminChecklistProps) {
  return (
    <Paper sx={{ borderRadius: `${tokens.borderRadius.lg}px`, overflow: 'hidden' }}>
      <Box sx={{ p: 2, bgcolor: tokens.colors.primary, color: '#fff' }}>
        <Typography variant="h3" sx={{ fontWeight: 600 }}>
          {section.name}
        </Typography>
      </Box>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, p: 2, bgcolor: tokens.colors.borderLight, borderBottom: `1px solid ${tokens.colors.border}` }}>
        <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: tokens.colors.text.secondary }}>Item Penilaian</Typography>
        <Typography variant="caption" sx={{ width: 120, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>Frekuensi</Typography>
        <Typography variant="caption" sx={{ width: 100, textAlign: 'right', fontWeight: 700, color: tokens.colors.text.secondary }}>Sub Total</Typography>
      </Box>
      <Box sx={{ p: 0 }}>
        {section.items.map((item: TmminChecklistItem, index: number) => {
          const currentFreq = frequencies[item.id] || 0;
          return (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: { xs: 2, sm: 3 },
                borderBottom: index < section.items.length - 1 ? `1px solid ${tokens.colors.border}` : 'none',
                gap: 2,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.status.danger, fontWeight: 700 }}>
                  Pengurangan Poin: {item.deduction}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => onChange(item.id, Math.max(0, currentFreq - 1))}
                  disabled={currentFreq === 0}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: tokens.colors.borderLight,
                    '&:hover': { bgcolor: tokens.colors.border },
                    border: `1px solid ${tokens.colors.border}`,
                    color: tokens.colors.text.primary,
                    borderRadius: 1,
                  }}
                >
                  <Minus size={20} />
                </IconButton>

                <Typography variant="h5" sx={{ width: 40, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.primary }}>
                  {currentFreq}
                </Typography>

                <IconButton
                  onClick={() => onChange(item.id, currentFreq + 1)}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: tokens.colors.borderLight,
                    '&:hover': { bgcolor: tokens.colors.border },
                    border: `1px solid ${tokens.colors.border}`,
                    color: tokens.colors.text.primary,
                    borderRadius: 1,
                  }}
                >
                  <Plus size={20} />
                </IconButton>
              </Box>

              <Box sx={{ width: 100, textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body1" sx={{ fontWeight: 700, color: currentFreq > 0 ? tokens.colors.status.danger : tokens.colors.text.tertiary }}>
                  {currentFreq > 0 ? `-${currentFreq * item.deduction}` : '-'}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
