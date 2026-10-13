'use client';

import React from 'react';
import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import { Truck, Forklift } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { AssessmentType } from '@/lib/assessment';

interface AssessmentTypeSelectorProps {
  selected: AssessmentType | null;
  onSelect: (type: AssessmentType) => void;
}

const TYPES = [
  {
    type: 'DDT' as AssessmentType,
    label: 'Truck Assessment',
    subtitle: 'DDT',
    icon: Truck,
    available: true,
  },
  {
    type: 'TMMIN' as AssessmentType,
    label: 'Forklift Operation',
    subtitle: 'Forklift',
    icon: Forklift,
    available: true,
  },
];

export default function AssessmentTypeSelector({ selected, onSelect }: AssessmentTypeSelectorProps) {
  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5, color: tokens.colors.text.primary }}>
        Pilih Jenis Penilaian
      </Typography>
      <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 3 }}>
        Pilih jenis assessment yang akan dilaksanakan
      </Typography>

      <Grid container spacing={2}>
        {TYPES.map(({ type, label, subtitle, icon: Icon, available }) => {
          const isSelected = selected === type;
          return (
            <Grid item xs={12} sm={6} key={type} sx={{ display: 'flex' }}>
              <Paper
                onClick={() => available && onSelect(type)}
                sx={{
                  width: '100%',
                  p: 3,
                  cursor: available ? 'pointer' : 'not-allowed',
                  opacity: available ? 1 : 0.55,
                  border: `2px solid ${isSelected ? tokens.colors.primaryLight : tokens.colors.border
                    }`,
                  bgcolor: isSelected ? tokens.colors.status.infoBg : tokens.colors.surface,
                  transition: 'all 0.15s ease',
                  '&:hover': available
                    ? {
                      border: `2px solid ${tokens.colors.primaryLight}`,
                      boxShadow: '0 4px 16px rgba(59,130,246,0.12)',
                    }
                    : {},
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: `${tokens.borderRadius.md}px`,
                      bgcolor: isSelected ? tokens.colors.primaryLight : tokens.colors.borderLight,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={28} color={isSelected ? '#fff' : tokens.colors.text.secondary} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 700,
                          color: isSelected ? tokens.colors.primary : tokens.colors.text.primary,
                        }}
                      >
                        {label}
                      </Typography>
                      {!available && (
                        <Chip label="Coming Soon" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                      )}
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        color: isSelected ? tokens.colors.primaryLight : tokens.colors.text.secondary,
                        fontWeight: 600,
                      }}
                    >
                      {subtitle}
                    </Typography>
                    {type === 'DDT' && (
                      <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mt: 0.5 }}>
                        Total 100 poin &bull; 5 seksi &bull; Minimum lulus: 70
                      </Typography>
                    )}
                    {type === 'TMMIN' && (
                      <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mt: 0.5 }}>
                        Total 134 poin &bull; 2 Sub Job &bull; Minimum lulus: 70
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
