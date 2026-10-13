'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
  TablePagination,
} from '@mui/material';
import { History, PlusCircle, Search, Eye, Download, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ResultBadge from '@/components/common/ResultBadge';
import { getAssessmentDisplayName } from '@/lib/assessment';
import { tokens } from '@/lib/theme';

// ---- Types ----
interface AssessmentRow {
  id: string;
  assessmentDate: string;
  participantName: string;
  assessmentType: string;
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  score: string | number;
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED';
  trainingProgram?: string;
}

const API_BASE = 'http://localhost:5000/api';

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');

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
    setLoading(true);
    setError(null);
    async function loadData() {
      try {
        const res = await fetch('/api/assessments');
        if (!res.ok) throw new Error('Failed to load data from server');
        const parsed = await res.json();
        setRows(parsed);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data dari server');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus data assessment ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    try {
      const res = await fetch(`/api/assessments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Gagal menghapus data');
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      alert('Data assessment berhasil dihapus');
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus data');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.participantName.toLowerCase().includes(q) && !r.licensePlate.toLowerCase().includes(q)) return false;
      if (filterType && r.assessmentType !== filterType) return false;
      if (filterResult && r.result !== filterResult) return false;
      return true;
    });
  }, [rows, search, filterType, filterResult]);

  useEffect(() => {
    setPage(0);
  }, [search, filterType, filterResult]);

  // Data Slicing: applied after search/filters
  const data = filtered;
  const paginatedData = useMemo(() => {
    return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [data, page, rowsPerPage]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.assessmentType))), [rows]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const formatNoPolisi = (plat: string): string => {
    if (!plat || plat === '-') return plat;
    const cleaned = plat.replace(/[\s-]/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
    if (match) {
      if (match[3]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
      return `${match[1]}-${match[2]}`;
    }
    return cleaned;
  };

  const handleExportCSV = () => {
    const headers = [
      'Tanggal',
      'Nama Peserta',
      'Program Training',
      'Assessment',
      'Kendaraan',
      'No Polisi',
      'Lokasi',
      'Instruktur',
      'Nilai',
      'Result'
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const csvRows = [];
    csvRows.push(headers.map(escapeCSV).join(','));

    for (const row of filtered) {
      const rowData = [
        formatDate(row.assessmentDate),
        row.participantName,
        row.trainingProgram || '',
        getAssessmentDisplayName(row.assessmentType),
        row.vehicleType,
        formatNoPolisi(row.licensePlate),
        row.testLocation,
        row.instructor,
        parseFloat(String(row.score)).toFixed(1),
        row.result
      ];
      csvRows.push(rowData.map(escapeCSV).join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'Assessment_History.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell pageTitle="Assessment History">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <History size={24} color={tokens.colors.primaryLight} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
                  Assessment History
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                Riwayat penilaian yang tersimpan di database
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ml: 'auto' }}>
              <Button
                variant="outlined"
                startIcon={<Download size={18} />}
                size="large"
                onClick={handleExportCSV}
                disabled={filtered.length === 0}
                sx={{ minHeight: 48, fontWeight: 600 }}
              >
                Export CSV
              </Button>
            <Button
              component={Link}
              href="/assessment/new"
              variant="contained"
              startIcon={<PlusCircle size={18} />}
              size="large"
              sx={{ minHeight: 48, fontWeight: 600 }}
            >
              New Assessment
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              id="history-search"
              size="small"
              placeholder="Cari nama peserta / no polisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color={tokens.colors.text.tertiary} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: '1 1 240px', minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="filter-type-label">Jenis Assessment</InputLabel>
              <Select
                labelId="filter-type-label"
                id="filter-type"
                value={filterType}
                label="Jenis Assessment"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">Semua</MenuItem>
                {types.map((t) => (
                  <MenuItem key={t} value={t}>{getAssessmentDisplayName(t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="filter-result-label">Result</InputLabel>
              <Select
                labelId="filter-result-label"
                id="filter-result"
                value={filterResult}
                label="Result"
                onChange={(e) => setFilterResult(e.target.value)}
              >
                <MenuItem value="">Semua</MenuItem>
                <MenuItem value="PASS">PASS</MenuItem>
                <MenuItem value="FAIL">FAIL</MenuItem>
                <MenuItem value="DISQUALIFIED">DISQUALIFIED</MenuItem>
              </Select>
            </FormControl>
            {(search || filterType || filterResult) && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => { setSearch(''); setFilterType(''); setFilterResult(''); }}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Paper>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Table */}
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell>Nama Peserta</TableCell>
                  <TableCell>Assessment / Program</TableCell>
                  <TableCell>Kendaraan</TableCell>
                  <TableCell>No Polisi</TableCell>
                  <TableCell>Lokasi</TableCell>
                  <TableCell>Instruktur</TableCell>
                  <TableCell align="right">Nilai</TableCell>
                  <TableCell align="center">Result</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                )}

                {!loading && !error && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <History size={40} color={tokens.colors.text.tertiary} strokeWidth={1} />
                        <Typography variant="h5" sx={{ mt: 2, color: tokens.colors.text.secondary }}>
                          {rows.length === 0
                            ? 'Belum ada data assessment.'
                            : 'Tidak ada data yang sesuai filter'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mt: 0.5 }}>
                          {rows.length === 0
                            ? 'Silakan lakukan assessment baru.'
                            : 'Coba ubah kata kunci atau filter.'}
                        </Typography>
                        {rows.length === 0 && (
                          <Button
                            component={Link}
                            href="/assessment/new"
                            variant="contained"
                            startIcon={<PlusCircle size={16} />}
                            sx={{ mt: 2 }}
                          >
                            Mulai Penilaian
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && paginatedData.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => router.push(`/assessment/history/${row.id}`)}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.assessmentDate)}</TableCell>
                    <TableCell sx={{ fontWeight: 500, color: tokens.colors.text.primary }}>{row.participantName}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.text.secondary }}>{row.trainingProgram || '—'}</Typography>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1,
                          py: 0.25,
                          borderRadius: `${tokens.borderRadius.sm}px`,
                          bgcolor: tokens.colors.status.infoBg,
                          color: tokens.colors.status.info,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {getAssessmentDisplayName(row.assessmentType)}
                      </Box>
                    </TableCell>
                    <TableCell>{row.vehicleType}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatNoPolisi(row.licensePlate)}</TableCell>
                    <TableCell>{row.testLocation}</TableCell>
                    <TableCell>{row.instructor}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                      {parseFloat(String(row.score)).toFixed(1)}
                    </TableCell>
                    <TableCell align="center">
                      <ResultBadge result={row.result === 'DISQUALIFIED' ? 'FAIL' : row.result} />
                      {row.result === 'DISQUALIFIED' && (
                        <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.status.warning, fontWeight: 600 }}>
                          DISQ
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Lihat detail">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/assessment/history/${row.id}`);
                          }}
                          sx={{ color: tokens.colors.primaryLight }}
                          aria-label={`View detail ${row.participantName}`}
                        >
                          <Eye size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        {/* // TODO: Hide this button if user role is not Admin */}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/assessment/edit/${row.id}`);
                          }}
                          sx={{ color: tokens.colors.status.warning }}
                          aria-label={`Edit ${row.participantName}`}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDelete(row.id, e)}
                          sx={{ color: tokens.colors.status.danger }}
                          aria-label={`Delete ${row.participantName}`}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {!loading && !error && data.length > 0 && (
            <TablePagination
              component="div"
              count={data.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Baris per halaman:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} dari ${count !== -1 ? count : `lebih dari ${to}`}`
              }
              sx={{
                borderTop: `1px solid ${tokens.colors.border}`,
                px: 2,
              }}
            />
          )}
        </Paper>
      </Box>
    </AppShell>
  );
}
