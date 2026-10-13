import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Eye } from 'lucide-react';
import Link from 'next/link';
import { tokens } from '@/lib/theme';
import ResultBadge from '@/components/common/ResultBadge';
import { getAssessmentDisplayName } from '@/lib/assessment';

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
}

interface ReportsTableProps {
  data: ApiAssessment[];
}

export default function ReportsTable({ data }: ReportsTableProps) {
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [data]);

  const paginatedData = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <Paper sx={{ borderRadius: `${tokens.borderRadius.lg}px`, overflow: 'hidden', boxShadow: 'none', border: `1px solid ${tokens.colors.border}` }}>
      <TableContainer>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: tokens.colors.surface }}>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Participant</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Assessment</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Vehicle</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }}>Instructor</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }} align="center">Score</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }} align="center">Result</TableCell>
              <TableCell sx={{ fontWeight: 600, color: tokens.colors.text.secondary }} align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: tokens.colors.text.secondary }}>
                    Belum ada data assessment. Silakan lakukan assessment baru.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const scoreNum = typeof row.score === 'number' ? row.score : parseFloat(String(row.score));
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { bgcolor: tokens.colors.surface },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell sx={{ color: tokens.colors.text.secondary, whiteSpace: 'nowrap' }}>
                      {formatDate(row.assessmentDate)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                        {row.participantName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: tokens.colors.text.secondary }}>
                      {getAssessmentDisplayName(row.assessmentType)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.primary }}>
                        {row.vehicleType}
                      </Typography>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, fontSize: '0.75rem' }}>
                        {row.licensePlate}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: tokens.colors.text.secondary }}>{row.testLocation}</TableCell>
                    <TableCell sx={{ color: tokens.colors.text.secondary }}>{row.instructor}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: scoreNum >= 70 ? tokens.colors.status.success : tokens.colors.status.danger,
                        }}
                      >
                        {scoreNum.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <ResultBadge result={(row.result === 'DISQUALIFIED' ? 'FAIL' : row.result) as 'PASS' | 'FAIL'} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Detail">
                        <Link href={`/assessment/history/${row.id}`} passHref>
                          <IconButton size="small" sx={{ color: tokens.colors.primaryLight }}>
                            <Eye size={18} />
                          </IconButton>
                        </Link>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {data.length > 0 && (
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ borderTop: `1px solid ${tokens.colors.border}`, px: 2 }}
        />
      )}
    </Paper>
  );
}
