'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, Button, Alert, Skeleton } from '@mui/material';
import { Download, FileBarChart } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ReportsFilterBar, { ReportFilters } from '@/components/reports/ReportsFilterBar';
import ReportsTable from '@/components/reports/ReportsTable';
import { tokens } from '@/lib/theme';
import { getAssessmentDisplayName } from '@/lib/assessment';
import { exportToCSV } from '@/lib/export';

const API_BASE = 'http://localhost:5000/api';

interface ApiAssessment {
  id: string;
  assessmentType: string;
  assessmentDate: string;
  participantName: string;
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  score: string | number;
  result: string;
  createdAt?: string;
}

const DEFAULT_FILTERS: ReportFilters = {
  from: '',
  to: '',
  assessmentType: '',
  result: '',
  search: '',
};

export default function ReportsPage() {
  const [data, setData] = useState<ApiAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [assessmentTypes, setAssessmentTypes] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/assessments`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load assessment data.');
      const result = await res.json();
      const rows: ApiAssessment[] = result.data || result || [];
      setData(rows);
      
      const types = Array.from(new Set(rows.map(r => r.assessmentType)));
      setAssessmentTypes(types);
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyFilters = (filters: ReportFilters) => {
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  // Safe client-side filtering matching the requested logic
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Date filter (assessmentDate is assumed to be ISO string YYYY-MM-DD...)
      const dateStr = row.assessmentDate || row.createdAt || '';
      if (appliedFilters.from) {
        if (dateStr < appliedFilters.from) return false;
      }
      if (appliedFilters.to) {
        // Adding 'T23:59:59' to handle inclusivity logic properly if dates strictly match
        if (dateStr.slice(0, 10) > appliedFilters.to) return false;
      }
      
      // Type
      if (appliedFilters.assessmentType && row.assessmentType !== appliedFilters.assessmentType) {
        return false;
      }
      
      // Result
      if (appliedFilters.result) {
        // Standardize disqualified to FAIL for generic result filtering, or direct match
        const standardResult = row.result === 'DISQUALIFIED' ? 'FAIL' : row.result;
        if (standardResult !== appliedFilters.result && row.result !== appliedFilters.result) {
          return false;
        }
      }
      
      // Search Participant/Plate (case-insensitive)
      if (appliedFilters.search) {
        const query = appliedFilters.search.toLowerCase();
        const pName = (row.participantName || '').toLowerCase();
        const lPlate = (row.licensePlate || '').toLowerCase();
        if (!pName.includes(query) && !lPlate.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [data, appliedFilters]);

  const handleExportCSV = () => {
    if (!filteredData.length) return;

    const headers = [
      'Date',
      'Participant',
      'Assessment',
      'Vehicle',
      'License Plate',
      'Location',
      'Instructor',
      'Score',
      'Result',
    ];

    const mappedRows = filteredData.map(row => {
      const scoreNum = typeof row.score === 'number' ? row.score : parseFloat(String(row.score));
      return {
        'Date': (row.assessmentDate || row.createdAt || '').slice(0, 10),
        'Participant': row.participantName,
        'Assessment': getAssessmentDisplayName(row.assessmentType),
        'Vehicle': row.vehicleType,
        'License Plate': row.licensePlate,
        'Location': row.testLocation,
        'Instructor': row.instructor,
        'Score': scoreNum.toFixed(1),
        'Result': row.result === 'DISQUALIFIED' ? 'FAIL' : row.result,
      };
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(`slec-assessment-report-${dateStr}.csv`, mappedRows, headers);
  };

  return (
    <AppShell pageTitle="Reports">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 1400, mx: 'auto' }}>
        
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileBarChart size={24} color={tokens.colors.primaryLight} />
            <Box>
              <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
                Reports
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                Assessment reports and data export.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<Download size={18} />}
            onClick={handleExportCSV}
            disabled={loading || filteredData.length === 0}
            sx={{ fontWeight: 600 }}
          >
            Export CSV
          </Button>
        </Box>

        {/* Filter Section */}
        <ReportsFilterBar
          initialFilters={appliedFilters}
          assessmentTypes={assessmentTypes}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        {/* State Management */}
        {error && (
          <Alert
            severity="error"
            action={
              <Box component="button" onClick={loadData} sx={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
                Retry
              </Box>
            }
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box>
            <Skeleton variant="rectangular" height={50} sx={{ borderRadius: `${tokens.borderRadius.md}px`, mb: 1 }} />
            <Skeleton variant="rectangular" height={50} sx={{ borderRadius: `${tokens.borderRadius.md}px`, mb: 1 }} />
            <Skeleton variant="rectangular" height={50} sx={{ borderRadius: `${tokens.borderRadius.md}px`, mb: 1 }} />
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 1, fontWeight: 600 }}>
              Showing {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </Typography>
            <ReportsTable data={filteredData} />
          </Box>
        )}

      </Box>
    </AppShell>
  );
}
