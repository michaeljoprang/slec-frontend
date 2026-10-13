'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { tokens } from '@/lib/theme';
import type { RecentAssessmentRow } from '@/types';
import ResultBadge from '@/components/common/ResultBadge';

interface RecentAssessmentsTableProps {
  data: RecentAssessmentRow[];
}

export default function RecentAssessmentsTable({ data }: RecentAssessmentsTableProps) {
  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${tokens.colors.borderLight}` }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          Recent Assessments
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
          Latest assessment results
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Driver</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Location</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Score</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Result</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>{row.date}</TableCell>
                <TableCell sx={{ fontWeight: 500, color: tokens.colors.text.primary, whiteSpace: 'nowrap' }}>{row.driverName}</TableCell>
                <TableCell sx={{ color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>{row.assessmentType}</TableCell>
                <TableCell sx={{ color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>{row.location}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>{row.score}</TableCell>
                <TableCell align="right">
                  <ResultBadge result={row.result} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
