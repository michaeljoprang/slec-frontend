'use client';

import React, { useEffect } from 'react';
import {
  Paper,
  Grid,
  TextField,
  Typography,
  Box,
  Alert,
  MenuItem,
} from '@mui/material';
import { tokens } from '@/lib/themeTokens';
import { isForkliftAssessment, TRAINING_PROGRAM_OPTIONS, getTrainingProgramLabel, formatVehicleIdentifier, formatPersonName } from '@/lib/assessment';
import type { DDTHeaderInfo, AssessmentType } from '@/lib/assessment';

interface AssessmentHeaderProps {
  info: DDTHeaderInfo;
  onChange: (info: DDTHeaderInfo) => void;
  errors?: Partial<Record<keyof DDTHeaderInfo, string>>;
  assessmentType?: AssessmentType | string | null;
}

export const TEST_LOCATIONS = [
  { value: 'CCR CIBITUNG 1', label: 'CCR CIBITUNG 1' },
  { value: 'CCR CIBITUNG 2', label: 'CCR CIBITUNG 2' },
  { value: 'CCR KARAWANG', label: 'CCR KARAWANG' },
  { value: 'CCR JAKARTA', label: 'CCR JAKARTA' },
  { value: 'CCR SEMARANG', label: 'CCR SEMARANG' },
  { value: 'CCR SURABAYA', label: 'CCR SURABAYA' },
] as const;

export const TRUCK_SIM_CATEGORIES = [
  { value: 'SIM B1 Umum', label: 'SIM B1 Umum' },
  { value: 'SIM B2 Umum', label: 'SIM B2 Umum' },
  { value: 'SIM A', label: 'SIM A' },
] as const;

export const FORKLIFT_LICENSE_OPTIONS = [
  { value: 'SIO Disnaker / Kemnaker', label: 'SIO Disnaker / Kemnaker' },
  { value: 'SIO Disnaker / Kemnaker (Kelas 1)', label: 'SIO Disnaker / Kemnaker (Kelas 1)' },
  { value: 'SIO Disnaker / Kemnaker (Kelas 2)', label: 'SIO Disnaker / Kemnaker (Kelas 2)' },
  { value: 'Tidak Ada', label: 'Tidak Ada' },
] as const;

export const SIM_CATEGORIES = [
  { value: 'SIM B1 Umum', label: 'SIM B1 Umum' },
  { value: 'SIM B2 Umum', label: 'SIM B2 Umum' },
  { value: 'SIM A', label: 'SIM A' },
  { value: 'SIO Disnaker / Kemnaker', label: 'SIO Disnaker / Kemnaker' },
  { value: 'Tidak Ada', label: 'Tidak Ada' },
] as const;

export const TRUCK_FLEET_TYPES = [
  { value: 'Grandmax (Pick Up)', label: 'Grandmax (Pick Up)' },
  { value: 'Engkel (CDE)', label: 'Engkel (CDE)' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Tronton', label: 'Tronton' },
  { value: 'Trailer', label: 'Trailer' },
] as const;

export const VEHICLE_TYPES = [
  ...TRUCK_FLEET_TYPES,
  { value: 'Forklift', label: 'Forklift' },
] as const;

export const INSTRUCTORS = [
  { value: 'Yayan', label: 'Yayan' },
  { value: 'Chodir', label: 'Chodir' },
] as const;

export const SIO_KEMNAKER_OPTIONS = [
  { value: 'Ada Terdaftar', label: 'Ada Terdaftar' },
  { value: 'Ada Tidak Terdaftar', label: 'Ada Tidak Terdaftar' },
  { value: 'Tidak ada', label: 'Tidak ada' },
] as const;

export const TRAINING_PROGRAMS = TRAINING_PROGRAM_OPTIONS;

export default function AssessmentHeader({ info, onChange, errors, assessmentType }: AssessmentHeaderProps) {
  // Dynamic detection for Forklift unit
  const isForklift = Boolean(
    isForkliftAssessment(assessmentType) ||
    (info.jenisKendaraan && info.jenisKendaraan.toLowerCase().includes('forklift')) ||
    (info.trainingProgram && info.trainingProgram.toLowerCase().includes('forklift'))
  );
  const vehicleLabel = isForklift ? 'No. Body' : 'No. Polisi';
  const vehiclePlaceholder = isForklift ? 'Contoh: FL-01 atau FL-02' : 'Contoh: B 1234 XYZ';

  // Ensure default lokasiTest is CCR CIBITUNG 1 if not already populated
  useEffect(() => {
    if (!info.lokasiTest) {
      onChange({ ...info, lokasiTest: 'CCR CIBITUNG 1' });
    }
  }, [info, onChange]);

  // Auto-fill and lock jenisKendaraan & golSIM based on assessmentType
  useEffect(() => {
    if (assessmentType) {
      if (isForklift) {
        const needVehicleChange = info.jenisKendaraan !== 'Forklift';
        const needLicenseChange = !info.golSIM || info.golSIM.startsWith('SIM ');
        if (needVehicleChange || needLicenseChange) {
          onChange({
            ...info,
            ...(needVehicleChange ? { jenisKendaraan: 'Forklift' } : {}),
            ...(needLicenseChange ? { golSIM: 'SIO Disnaker / Kemnaker' } : {}),
          });
        }
      } else {
        // Truck DDT
        const needVehicleReset = info.jenisKendaraan === 'Forklift';
        const needLicenseReset = !info.golSIM || info.golSIM.includes('SIO');
        if (needVehicleReset || needLicenseReset) {
          onChange({
            ...info,
            ...(needVehicleReset ? { jenisKendaraan: 'CDD' } : {}),
            ...(needLicenseReset ? { golSIM: 'SIM B2 Umum' } : {}),
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentType, isForklift, info.jenisKendaraan, info.golSIM]);

  const handleChange = (key: keyof DDTHeaderInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ ...info, [key]: e.target.value });
  };

  const handleNoPolisiChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ ...info, noPolisi: e.target.value.toUpperCase() });
  };

  const handleNoPolisiBlur = () => {
    if (info.noPolisi) {
      const formatted = formatVehicleIdentifier(info.noPolisi, isForklift);
      if (formatted !== '—' && formatted !== info.noPolisi) {
        onChange({ ...info, noPolisi: formatted });
      }
    }
  };

  const hasErrors = errors && Object.values(errors).some(Boolean);

  const commonFieldSx = {
    '& .MuiInputBase-root': {
      fontSize: { xs: '1rem', sm: '0.9375rem' },
      minHeight: 52,
    },
    '& .MuiInputLabel-root': {
      fontSize: { xs: '0.9375rem', sm: '0.875rem' },
    },
  };

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
        {/* ROW 1: Tanggal, Lokasi Test, Instruktur */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            required
            label="Tanggal"
            type="date"
            value={info.tanggal || ''}
            onChange={handleChange('tanggal')}
            error={!!errors?.tanggal}
            helperText={errors?.tanggal}
            InputLabelProps={{ shrink: true }}
            sx={commonFieldSx}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            select
            required
            label="Lokasi Test"
            value={info.lokasiTest || 'CCR CIBITUNG 1'}
            onChange={handleChange('lokasiTest')}
            error={!!errors?.lokasiTest}
            helperText={errors?.lokasiTest}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (!selected) {
                  return (
                    <Typography
                      component="span"
                      sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                    >
                      Pilih Lokasi Test (Master SENDA)
                    </Typography>
                  );
                }
                const found = TEST_LOCATIONS.find((loc) => loc.value === selected);
                return found ? found.label : (selected as string);
              },
            }}
            sx={commonFieldSx}
          >
            <MenuItem value="" disabled>
              <em>Pilih Lokasi Test (Master SENDA)</em>
            </MenuItem>
            {TEST_LOCATIONS.map((loc) => (
              <MenuItem key={loc.value} value={loc.value}>
                {loc.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            select
            required
            label="Instruktur"
            value={info.instruktur || ''}
            onChange={handleChange('instruktur')}
            error={!!errors?.instruktur}
            helperText={errors?.instruktur}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (!selected) {
                  return (
                    <Typography
                      component="span"
                      sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                    >
                      Pilih Instruktur
                    </Typography>
                  );
                }
                const found = INSTRUCTORS.find((inst) => inst.value === selected);
                return found ? found.label : (selected as string);
              },
            }}
            sx={commonFieldSx}
          >
            <MenuItem value="" disabled>
              <em>Pilih Instruktur</em>
            </MenuItem>
            {INSTRUCTORS.map((inst) => (
              <MenuItem key={inst.value} value={inst.value}>
                {inst.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* ROW 2: Nama Peserta, Umur, Program Training */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            required
            label="Nama Peserta"
            type="text"
            placeholder="Masukkan nama peserta"
            value={info.namaPeserta || ''}
            onChange={handleChange('namaPeserta')}
            onBlur={() => {
              if (info.namaPeserta) {
                const formatted = formatPersonName(info.namaPeserta);
                if (formatted !== info.namaPeserta) {
                  onChange({ ...info, namaPeserta: formatted });
                }
              }
            }}
            error={!!errors?.namaPeserta}
            helperText={errors?.namaPeserta}
            InputLabelProps={{ shrink: true }}
            sx={commonFieldSx}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            required
            label="Umur"
            type="number"
            placeholder="Contoh: 28"
            value={info.umur || ''}
            onChange={handleChange('umur')}
            error={!!errors?.umur}
            helperText={errors?.umur}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 17, max: 80 }}
            sx={commonFieldSx}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            select
            required
            label="Program Training"
            value={info.trainingProgram || ''}
            onChange={(e) =>
              onChange({ ...info, trainingProgram: e.target.value as DDTHeaderInfo['trainingProgram'] })
            }
            error={!!errors?.trainingProgram}
            helperText={errors?.trainingProgram}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (!selected) {
                  return (
                    <Typography
                      component="span"
                      sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                    >
                      Pilih Program Training
                    </Typography>
                  );
                }
                return getTrainingProgramLabel(selected as string);
              },
            }}
            sx={commonFieldSx}
          >
            <MenuItem value="" disabled>
              <em>Pilih Program Training</em>
            </MenuItem>
            {TRAINING_PROGRAMS.map((program) => (
              <MenuItem key={program.value} value={program.value}>
                {program.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* ROW 3: Jenis Kendaraan / Tipe Armada & No Polisi */}
        <Grid item xs={12} sm={6} md={6}>
          {isForklift ? (
            <TextField
              fullWidth
              disabled
              label="Jenis Kendaraan / Unit"
              value="Forklift"
              helperText="Terkunci otomatis untuk asesmen Forklift"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                readOnly: true,
              }}
              sx={{
                ...commonFieldSx,
                '& .MuiInputBase-root': {
                  ...commonFieldSx['& .MuiInputBase-root'],
                  bgcolor: '#f1f5f9',
                  cursor: 'not-allowed',
                },
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: tokens.colors.text.primary,
                  fontWeight: 600,
                },
              }}
            />
          ) : (
            <TextField
              fullWidth
              select
              required
              label="Tipe Armada / Jenis Kendaraan"
              value={info.jenisKendaraan || ''}
              onChange={handleChange('jenisKendaraan')}
              error={!!errors?.jenisKendaraan}
              helperText={errors?.jenisKendaraan || 'Pilih tipe armada truk yang diujikan (Master SENDA)'}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return (
                      <Typography
                        component="span"
                        sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                      >
                        Pilih Tipe Armada (Master SENDA)
                      </Typography>
                    );
                  }
                  const found = TRUCK_FLEET_TYPES.find((v) => v.value === selected);
                  return found ? found.label : (selected as string);
                },
              }}
              sx={commonFieldSx}
            >
              <MenuItem value="" disabled>
                <em>Pilih Tipe Armada (Master SENDA)</em>
              </MenuItem>
              {TRUCK_FLEET_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={6}>
          <TextField
            fullWidth
            required
            label={vehicleLabel}
            type="text"
            placeholder={vehiclePlaceholder}
            value={info.noPolisi || ''}
            onChange={handleNoPolisiChange}
            onBlur={handleNoPolisiBlur}
            error={!!errors?.noPolisi}
            helperText={errors?.noPolisi}
            InputLabelProps={{ shrink: true }}
            sx={commonFieldSx}
          />
        </Grid>

        {/* ROW 4: Gol SIM / Lisensi SIO, Masa Berlaku, SIO Kemnaker */}
        <Grid item xs={12} sm={6} md={4}>
          {isForklift ? (
            <TextField
              fullWidth
              select
              required
              label="Lisensi Operator (SIO)"
              value={info.golSIM || 'SIO Disnaker / Kemnaker'}
              onChange={handleChange('golSIM')}
              error={!!errors?.golSIM}
              helperText={errors?.golSIM || 'SIO Disnaker / Kemnaker untuk unit Forklift'}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return (
                      <Typography
                        component="span"
                        sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                      >
                        Pilih Lisensi SIO
                      </Typography>
                    );
                  }
                  const found = FORKLIFT_LICENSE_OPTIONS.find((cat) => cat.value === selected);
                  return found ? found.label : (selected as string);
                },
              }}
              sx={commonFieldSx}
            >
              <MenuItem value="" disabled>
                <em>Pilih Lisensi SIO</em>
              </MenuItem>
              {FORKLIFT_LICENSE_OPTIONS.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              fullWidth
              select
              required
              label="Golongan SIM"
              value={info.golSIM || ''}
              onChange={handleChange('golSIM')}
              error={!!errors?.golSIM}
              helperText={errors?.golSIM || 'Pilih golongan SIM driver (Master SENDA)'}
              InputLabelProps={{ shrink: true }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (!selected) {
                    return (
                      <Typography
                        component="span"
                        sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                      >
                        Pilih Golongan SIM
                      </Typography>
                    );
                  }
                  const found = TRUCK_SIM_CATEGORIES.find((cat) => cat.value === selected);
                  return found ? found.label : (selected as string);
                },
              }}
              sx={commonFieldSx}
            >
              <MenuItem value="" disabled>
                <em>Pilih Golongan SIM</em>
              </MenuItem>
              {TRUCK_SIM_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            required
            label={isForklift ? 'Masa Berlaku SIO / Lisensi' : 'Masa Berlaku SIM'}
            type="date"
            value={info.masaBerlakuSIM || ''}
            onChange={handleChange('masaBerlakuSIM')}
            error={!!errors?.masaBerlakuSIM}
            helperText={errors?.masaBerlakuSIM}
            InputLabelProps={{ shrink: true }}
            sx={commonFieldSx}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            select
            required
            label={isForklift ? 'Status SIO Kemnaker / Disnaker' : 'SIO Kemnaker'}
            value={info.sioKemnaker || ''}
            onChange={handleChange('sioKemnaker')}
            error={!!errors?.sioKemnaker}
            helperText={errors?.sioKemnaker}
            InputLabelProps={{ shrink: true }}
            SelectProps={{
              displayEmpty: true,
              renderValue: (selected) => {
                if (!selected) {
                  return (
                    <Typography
                      component="span"
                      sx={{ color: tokens.colors.text.tertiary, fontSize: { xs: '1rem', sm: '0.9375rem' } }}
                    >
                      Pilih SIO Kemnaker
                    </Typography>
                  );
                }
                const found = SIO_KEMNAKER_OPTIONS.find((opt) => opt.value === selected);
                return found ? found.label : (selected as string);
              },
            }}
            sx={commonFieldSx}
          >
            <MenuItem value="" disabled>
              <em>Pilih SIO Kemnaker</em>
            </MenuItem>
            {SIO_KEMNAKER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
}
