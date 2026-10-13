'use client';

import React from 'react';
import {
  Paper,
  Grid,
  TextField,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { tokens } from '@/lib/theme';
import type { DDTHeaderInfo } from '@/lib/assessment';

interface AssessmentHeaderProps {
  info: DDTHeaderInfo;
  onChange: (info: DDTHeaderInfo) => void;
  errors?: Partial<Record<keyof DDTHeaderInfo, string>>;
}

const FIELD_LABELS: { key: keyof DDTHeaderInfo; label: string; type?: string }[] = [
  { key: 'tanggal', label: 'Tanggal', type: 'date' },
  { key: 'lokasiTest', label: 'Lokasi Test' },
  { key: 'jenisKendaraan', label: 'Jenis Kendaraan' },
  { key: 'noPolisi', label: 'No Polisi' },
  { key: 'namaPeserta', label: 'Nama Peserta' },
  { key: 'umur', label: 'Umur', type: 'number' },
  { key: 'golSIM', label: 'Gol SIM / Terbitan' },
  { key: 'masaBerlakuSIM', label: 'Masa Berlaku SIM', type: 'date' },
  { key: 'instruktur', label: 'Instruktur' },
];

const TRAINING_PROGRAMS = [
  { value: 'NEOP', label: 'NEOP' },
  { value: 'REFRESHMENT', label: 'Refreshment' },
  { value: 'TEST_DRIVE', label: 'Test Drive' },
] as const;

export default function AssessmentHeader({ info, onChange, errors }: AssessmentHeaderProps) {
  const handleChange = (key: keyof DDTHeaderInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...info, [key]: e.target.value });
  };

  const hasErrors = errors && Object.values(errors).some(Boolean);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          Informasi Peserta
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.25 }}>
          Lengkapi data peserta sebelum memulai penilaian
        </Typography>
      </Box>

      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Mohon lengkapi semua field yang wajib diisi sebelum melanjutkan.
        </Alert>
      )}

      <Grid container spacing={2}>
        {FIELD_LABELS.map(({ key, label, type }) => (
          <Grid item xs={12} sm={6} md={4} key={key}>
            <TextField
              fullWidth
              label={label}
              type={type || 'text'}
              value={info[key]}
              onChange={handleChange(key)}
              error={!!errors?.[key]}
              helperText={errors?.[key]}
              InputLabelProps={type === 'date' ? { shrink: true } : undefined}
              inputProps={type === 'number' ? { min: 17, max: 80 } : undefined}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '1rem', sm: '0.9375rem' },
                  minHeight: 52,
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.9375rem', sm: '0.875rem' },
                },
              }}
            />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            select
            required
            label="Program Training"
            value={info.trainingProgram || ''}
            onChange={(e) => onChange({ ...info, trainingProgram: e.target.value as DDTHeaderInfo['trainingProgram'] })}
            error={!!errors?.trainingProgram}
            helperText={errors?.trainingProgram}
            SelectProps={{ native: true }}
            sx={{
              '& .MuiInputBase-root': { minHeight: 52 },
            }}
          >
            <option value="">Pilih Program Training</option>
            {TRAINING_PROGRAMS.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
}
