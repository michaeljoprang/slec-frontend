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
  Chip,
} from '@mui/material';
import { tokens } from '@/lib/theme';
import type { DriverPerformanceRow } from '@/types';

interface DriverPerformanceTableProps {
  data: DriverPerformanceRow[];
}

export default function DriverPerformanceTable({ data }: DriverPerformanceTableProps) {
  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${tokens.colors.borderLight}` }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          Driver Performance
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
          Assessments and scores by driver
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Driver</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Assessments</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Avg Score</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Pass Rate</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => {
              const isGood = row.status === 'Good';
              return (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>{row.driverName}</TableCell>
                  <TableCell align="center">{row.assessmentsCount}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{row.averageScore.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.passRate}%</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        bgcolor: isGood ? tokens.colors.status.successBg : tokens.colors.status.warningBg,
                        color: isGood ? tokens.colors.status.success : tokens.colors.status.warning,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
