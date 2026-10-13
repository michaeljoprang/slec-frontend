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

interface PerformanceTableProps {
  title: string;
  subtitle: string;
  data: any[];
  entityLabel: string;
  entityKey: string;
}

export default function PerformanceTable({ title, subtitle, data, entityLabel, entityKey }: PerformanceTableProps) {


  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <Box sx={{ p: 2.5, borderBottom: `1px solid ${tokens.colors.borderLight}` }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
          {subtitle}
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>{entityLabel}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Assessments</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Pass</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Fail</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Avg Score</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: tokens.colors.text.secondary, bgcolor: tokens.colors.surface }}>Pass Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(!data || data.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: tokens.colors.text.secondary }}>
                    Belum ada data assessment. Silakan lakukan assessment baru.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const passRate = row.passRate;
                const isGood = passRate >= 70;
                return (
                <TableRow key={`${row[entityKey]}-${index}`} hover>
                  <TableCell sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>{row[entityKey]}</TableCell>
                  <TableCell align="center">{row.totalAssessments}</TableCell>
                  <TableCell align="center" sx={{ color: tokens.colors.status.success }}>{row.passCount}</TableCell>
                  <TableCell align="center" sx={{ color: tokens.colors.status.danger }}>{row.failCount}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{row.averageScore.toFixed(1)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${passRate}%`}
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
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
