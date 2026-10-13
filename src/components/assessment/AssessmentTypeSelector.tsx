'use client';

import React, { useState } from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { Truck, Forklift } from 'lucide-react';
import { tokens } from '@/lib/theme';
import type { AssessmentType } from '@/lib/assessment';

interface AssessmentTypeSelectorProps {
  selected: AssessmentType | null;
  onSelect: (type: AssessmentType) => void;
}

const FORKLIFT_TYPES: { type: AssessmentType; label: string; detail: string }[] = [
  { type: 'TMMIN_STANDARD', label: 'Forklift - Standard', detail: 'Form standard · 134 poin · Lulus 70' },
  { type: 'TMMIN_REFRESHMENT', label: 'Forklift - Refreshment', detail: 'Bobot dan Plan · 277 poin · Lulus 75' },
];

export default function AssessmentTypeSelector({ selected, onSelect }: AssessmentTypeSelectorProps) {
  const [forkliftOpen, setForkliftOpen] = useState(selected === 'TMMIN_STANDARD' || selected === 'TMMIN_REFRESHMENT');
  const forkliftSelected = selected === 'TMMIN_STANDARD' || selected === 'TMMIN_REFRESHMENT';
  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5, color: tokens.colors.text.primary }}>Pilih Jenis Penilaian</Typography>
      <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 3 }}>Pilih jenis assessment yang akan dilaksanakan</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} sx={{ display: 'flex' }}>
          <Paper onClick={() => onSelect('DDT')} sx={{ width: '100%', p: 3, cursor: 'pointer', border: `2px solid ${selected === 'DDT' ? tokens.colors.primaryLight : tokens.colors.border}`, bgcolor: selected === 'DDT' ? tokens.colors.status.infoBg : tokens.colors.surface }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}><Box sx={{ width: 56, height: 56, borderRadius: `${tokens.borderRadius.md}px`, bgcolor: selected === 'DDT' ? tokens.colors.primaryLight : tokens.colors.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={28} color={selected === 'DDT' ? '#fff' : tokens.colors.text.secondary} /></Box><Box><Typography variant="h4" sx={{ fontWeight: 700 }}>Truck Assessment</Typography><Typography variant="body1" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>DDT</Typography><Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mt: 0.5 }}>Total 100 poin · Minimum lulus: 70</Typography></Box></Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} sx={{ display: 'flex' }}>
          <Paper onClick={() => setForkliftOpen(true)} sx={{ width: '100%', p: 3, cursor: 'pointer', border: `2px solid ${forkliftSelected ? tokens.colors.primaryLight : tokens.colors.border}`, bgcolor: forkliftSelected ? tokens.colors.status.infoBg : tokens.colors.surface }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}><Box sx={{ width: 56, height: 56, borderRadius: `${tokens.borderRadius.md}px`, bgcolor: forkliftSelected ? tokens.colors.primaryLight : tokens.colors.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Forklift size={28} color={forkliftSelected ? '#fff' : tokens.colors.text.secondary} /></Box><Box><Typography variant="h4" sx={{ fontWeight: 700 }}>Forklift</Typography><Typography variant="body1" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>Pilih kategori assessment</Typography></Box></Box>
            {forkliftOpen && <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>{FORKLIFT_TYPES.map((option) => <Box key={option.type} onClick={(event) => { event.stopPropagation(); onSelect(option.type); }} sx={{ p: 1.5, borderRadius: 1, cursor: 'pointer', border: `1px solid ${selected === option.type ? tokens.colors.primaryLight : tokens.colors.border}`, bgcolor: selected === option.type ? tokens.colors.surface : 'transparent' }}><Typography sx={{ fontWeight: 700 }}>{option.label}</Typography><Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>{option.detail}</Typography></Box>)}</Box>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
