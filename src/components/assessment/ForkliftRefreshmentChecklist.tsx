import React from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { tokens } from '@/lib/theme';
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
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, p: 2, bgcolor: tokens.colors.borderLight, borderBottom: `1px solid ${tokens.colors.border}` }}>
        <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: tokens.colors.text.secondary }}>Item Penilaian</Typography>
        <Typography variant="caption" sx={{ width: 70, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>Bobot</Typography>
        <Typography variant="caption" sx={{ width: 70, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>Plan</Typography>
        <Typography variant="caption" sx={{ width: 100, textAlign: 'center', fontWeight: 700, color: tokens.colors.text.secondary }}>Frekuensi</Typography>
        <Typography variant="caption" sx={{ width: 100, textAlign: 'right', fontWeight: 700, color: tokens.colors.text.secondary }}>Deduction</Typography>
      </Box>
      {section.items.map((item, index) => {
        const frequency = Math.min(item.plan, Math.max(0, frequencies[item.id] || 0));
        return <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: { xs: 2, sm: 3 }, borderBottom: index < section.items.length - 1 ? `1px solid ${tokens.colors.border}` : 'none', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Box sx={{ flex: 1, minWidth: 200 }}><Typography variant="body1" sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>{item.label}</Typography></Box>
          <Typography sx={{ width: 70, textAlign: 'center' }}>{item.deduction}</Typography>
          <Typography sx={{ width: 70, textAlign: 'center' }}>{item.plan}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => onChange(item.id, Math.max(0, frequency - 1))} disabled={frequency === 0} sx={{ width: 44, height: 44, bgcolor: tokens.colors.borderLight, border: `1px solid ${tokens.colors.border}` }}><Minus size={18} /></IconButton>
            <Typography variant="h5" sx={{ width: 30, textAlign: 'center', fontWeight: 700 }}>{frequency}</Typography>
            <IconButton onClick={() => onChange(item.id, Math.min(item.plan, frequency + 1))} disabled={frequency >= item.plan} sx={{ width: 44, height: 44, bgcolor: tokens.colors.borderLight, border: `1px solid ${tokens.colors.border}` }}><Plus size={18} /></IconButton>
          </Box>
          <Typography sx={{ width: 100, textAlign: 'right', fontWeight: 700, color: frequency ? tokens.colors.status.danger : tokens.colors.text.tertiary }}>{frequency ? `-${frequency * item.deduction}` : '-'}</Typography>
        </Box>;
      })}
    </Paper>
  );
}
