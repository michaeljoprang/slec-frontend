'use client';

import React, { useState } from 'react';
import { Box, Paper, TextField, Button, MenuItem, Alert } from '@mui/material';
import { tokens } from '@/lib/themeTokens';
import { TRAINING_PROGRAM_OPTIONS } from '@/lib/assessment';
import type { MonitoringFilters } from '@/types/monitoring';
import { Search, RotateCcw } from 'lucide-react';

interface MonitoringFilterBarProps {
  initialFilters: MonitoringFilters;
  onApply: (filters: MonitoringFilters) => void;
  onReset: () => void;
}

export default function MonitoringFilterBar({ initialFilters, onApply, onReset }: MonitoringFilterBarProps) {
  const [from, setFrom] = useState(initialFilters.from || '');
  const [to, setTo] = useState(initialFilters.to || '');
  const [assessmentType, setAssessmentType] = useState(initialFilters.assessmentType || 'ALL');
  const [trainingProgram, setTrainingProgram] = useState(initialFilters.trainingProgram || 'ALL');
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    setError(null);
    if (from && to && new Date(from) > new Date(to)) {
      setError('"From" date cannot be after "To" date');
      return;
    }
    onApply({ from, to, assessmentType, trainingProgram });
  };

  const handleReset = () => {
    setError(null);
    setFrom('');
    setTo('');
    setAssessmentType('ALL');
    setTrainingProgram('ALL');
    onReset();
  };

  return (
    <Paper sx={{ p: 2.5, mb: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { xs: 'stretch', md: 'flex-start' } }}>
        <TextField
          type="date"
          label="From Date"
          size="small"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          type="date"
          label="To Date"
          size="small"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          select
          label="Training Program"
          size="small"
          value={trainingProgram}
          onChange={(e) => setTrainingProgram(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All Programs</MenuItem>
          {TRAINING_PROGRAM_OPTIONS.map((p) => (
            <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Assessment Type"
          size="small"
          value={assessmentType}
          onChange={(e) => setAssessmentType(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All Types</MenuItem>
          <MenuItem value="DDT">Truck Assessment (DDT)</MenuItem>
          <MenuItem value="TMMIN_STANDARD">Forklift - Standard</MenuItem>
          <MenuItem value="TMMIN_REFRESHMENT">Forklift - Refreshment</MenuItem>
        </TextField>

        <Box sx={{ display: 'flex', gap: 1, ml: { md: 'auto' } }}>
          <Button
            variant="outlined"
            startIcon={<RotateCcw size={18} />}
            onClick={handleReset}
            sx={{ color: tokens.colors.text.secondary, borderColor: tokens.colors.border }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Search size={18} />}
            onClick={handleApply}
            disableElevation
          >
            Apply Filters
          </Button>
        </Box>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
}
