import React, { useState, useEffect } from 'react';
import { Box, Paper, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { tokens } from '@/lib/theme';
import { getAssessmentDisplayName } from '@/lib/assessment';

export interface ReportFilters {
  from: string;
  to: string;
  assessmentType: string;
  result: string;
  trainingProgram?: string;
  search: string;
}

interface ReportsFilterBarProps {
  initialFilters: ReportFilters;
  assessmentTypes: string[];
  onApply: (filters: ReportFilters) => void;
  onReset: () => void;
}

export default function ReportsFilterBar({ initialFilters, assessmentTypes, onApply, onReset }: ReportsFilterBarProps) {
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);

  // Sync internal state if initialFilters changes via reset
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const handleChange = (field: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search participant / plate..."
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color={tokens.colors.text.tertiary} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: '1 1 200px', minWidth: 200 }}
        />

        {/* Date From */}
        <TextField
          label="Date From"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.from}
          onChange={(e) => handleChange('from', e.target.value)}
          sx={{ width: 150 }}
        />

        {/* Date To */}
        <TextField
          label="Date To"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.to}
          onChange={(e) => handleChange('to', e.target.value)}
          sx={{ width: 150 }}
        />

        {/* Assessment Type */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="reports-type-label">Type</InputLabel>
          <Select
            labelId="reports-type-label"
            value={filters.assessmentType}
            label="Type"
            onChange={(e) => handleChange('assessmentType', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {assessmentTypes.map((t) => (
              <MenuItem key={t} value={t}>{getAssessmentDisplayName(t)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Training Program */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="reports-program-label">Program</InputLabel>
          <Select labelId="reports-program-label" value={filters.trainingProgram || ''} label="Program" onChange={(e) => handleChange('trainingProgram', e.target.value)}>
            <MenuItem value="">All</MenuItem><MenuItem value="NEOP">NEOP</MenuItem><MenuItem value="REFRESHMENT">Refreshment</MenuItem><MenuItem value="TEST_DRIVE">Test Drive</MenuItem>
          </Select>
        </FormControl>

        {/* Result */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="reports-result-label">Result</InputLabel>
          <Select
            labelId="reports-result-label"
            value={filters.result}
            label="Result"
            onChange={(e) => handleChange('result', e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PASS">PASS</MenuItem>
            <MenuItem value="FAIL">FAIL</MenuItem>
            <MenuItem value="DISQUALIFIED">DISQUALIFIED</MenuItem>
          </Select>
        </FormControl>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
          <Button
            variant="outlined"
            onClick={onReset}
            startIcon={<RotateCcw size={16} />}
            sx={{
              color: tokens.colors.text.secondary,
              borderColor: tokens.colors.border,
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            startIcon={<Filter size={16} />}
            sx={{
              bgcolor: tokens.colors.primary,
              '&:hover': { bgcolor: tokens.colors.primaryLight },
            }}
          >
            Apply
          </Button>
        </Box>

      </Box>
    </Paper>
  );
}
