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
  Grid,
} from '@mui/material';
import {
  History,
  PlusCircle,
  Search,
  Eye,
  Download,
  Trash2,
  Pencil,
  Play,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import PrintIcon from '@mui/icons-material/Print';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ResultBadge from '@/components/common/ResultBadge';
import {
  getAssessmentDisplayName,
  getTrainingProgramLabel,
  formatAuditDocNumber,
  formatVehicleIdentifier,
  cleanTrainerNotes,
  formatPersonName,
} from '@/lib/assessment';
import { tokens } from '@/lib/themeTokens';
import { exportToCSV } from '@/lib/export';
import DateRangeFilter, { isWithinDateRangeInclusive } from '@/components/common/DateRangeFilter';

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
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED' | 'DRAFT' | 'IN_PROGRESS' | string;
  status?: string;
  trainingProgram?: string;
  trainerNotes?: string | null;
  notes?: string | null;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function isForkliftRow(row: AssessmentRow): boolean {
  const vt = (row.vehicleType || '').toLowerCase();
  const at = (row.assessmentType || '').toUpperCase();
  const tp = (row.trainingProgram || '').toLowerCase();
  return (
    vt.includes('forklift') ||
    at.includes('FORKLIFT') ||
    at === 'TMMIN' ||
    at === 'TMMIN_STANDARD' ||
    at === 'TMMIN_REFRESHMENT' ||
    tp.includes('forklift')
  );
}

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    setError(null);
    async function loadData() {
      try {
        const res = await fetch('/api/assessments', { cache: 'no-store' });
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
    const qClean = q.replace(/[^a-z0-9]/g, '');

    return rows.filter((r) => {
      // Filter rentang tanggal secara inklusif (00:00:00 Awal Periode s/d 23:59:59 Akhir Periode)
      if (!isWithinDateRangeInclusive(r.assessmentDate, startDate, endDate)) {
        return false;
      }

      if (q) {
        const docNo = formatAuditDocNumber(r.id, r.assessmentType, r.assessmentDate).toLowerCase();
        const idLower = (r.id || '').toLowerCase();
        const idClean = idLower.replace(/[^a-z0-9]/g, '');
        const nameLower = (r.participantName || '').toLowerCase();
        const plateLower = (r.licensePlate || '').toLowerCase();
        const plateClean = plateLower.replace(/[^a-z0-9]/g, '');
        const locationLower = (r.testLocation || '').toLowerCase();
        const instructorLower = (r.instructor || '').toLowerCase();

        const matchesDocNo = docNo.includes(q);
        const matchesId = idLower.includes(q) || (qClean.length > 0 && idClean.includes(qClean));
        const matchesName = nameLower.includes(q);
        const matchesPlate = plateLower.includes(q) || (qClean.length > 0 && plateClean.includes(qClean));
        const matchesLocation = locationLower.includes(q);
        const matchesInstructor = instructorLower.includes(q);

        if (!matchesDocNo && !matchesId && !matchesName && !matchesPlate && !matchesLocation && !matchesInstructor) {
          return false;
        }
      }
      if (filterType && r.assessmentType !== filterType) return false;
      if (filterResult && r.result !== filterResult) return false;
      return true;
    });
  }, [rows, search, filterType, filterResult, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterResult, startDate, endDate]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Data Slicing: applied after search/filters
  const paginatedData = useMemo(() => {
    return filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filtered, currentPage, pageSize]);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.assessmentType))), [rows]);

  // Summary metrics calculated from filtered completed assessments (reacts dynamically to active filters)
  const summaryMetrics = useMemo(() => {
    const completed = filtered.filter(
      (r) => !['DRAFT', 'IN_PROGRESS'].includes(String(r.status || r.result || '').toUpperCase())
    );
    const total = completed.length;
    const passed = completed.filter((r) => String(r.result).toUpperCase() === 'PASS').length;
    const passPct = total > 0 ? Math.round((passed / total) * 100) : 0;
    const failed = completed.filter((r) => ['FAIL', 'DISQUALIFIED'].includes(String(r.result).toUpperCase())).length;
    const avg =
      total > 0
        ? (completed.reduce((acc, r) => acc + (parseFloat(String(r.score)) || 0), 0) / total).toFixed(1)
        : '0.0';

    return {
      totalEvaluasi: total,
      siapOperasi: `${passed} (${passPct}%)`,
      perluRetraining: failed,
      rataRataSkor: avg,
    };
  }, [filtered]);

  const handleExportCSV = () => {
    const headers = [
      'No. Dokumen',
      'Tanggal',
      'Nama Peserta',
      'Program Training',
      'Assessment',
      'Kendaraan',
      'No. Polisi / No. Body',
      'Lokasi',
      'Instruktur',
      'Nilai',
      'Result',
      'Catatan Trainer',
    ];

    const dataRows = filtered.map((row) => {
      const notesClean = cleanTrainerNotes(row.trainerNotes || row.notes);
      return {
        'No. Dokumen': formatAuditDocNumber(row.id, row.assessmentType, row.assessmentDate),
        Tanggal: formatDate(row.assessmentDate),
        'Nama Peserta': formatPersonName(row.participantName),
        'Program Training': getTrainingProgramLabel(row.trainingProgram),
        Assessment: getAssessmentDisplayName(row.assessmentType),
        Kendaraan: row.vehicleType,
        'No. Polisi / No. Body': formatVehicleIdentifier(row.licensePlate, isForkliftRow(row)),
        Lokasi: row.testLocation,
        Instruktur: formatPersonName(row.instructor),
        Nilai: parseFloat(String(row.score)).toFixed(1),
        Result: row.result,
        'Catatan Trainer': notesClean || '-',
      };
    });

    exportToCSV('Assessment_History.csv', dataRows, headers);
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

        {/* Monitoring Integrated Summary Cards */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {[
              {
                label: 'TOTAL EVALUASI',
                value: summaryMetrics.totalEvaluasi,
                icon: ClipboardList,
                color: tokens.colors.text.primary,
                bgIcon: '#f1f5f9',
                sub: 'Total asesmen selesai',
              },
              {
                label: 'SIAP OPERASI (PASS)',
                value: summaryMetrics.siapOperasi,
                icon: CheckCircle2,
                color: '#059669',
                bgIcon: '#ecfdf5',
                sub: 'Lulus standar evaluasi',
              },
              {
                label: 'PERLU RETRAINING (FAIL)',
                value: summaryMetrics.perluRetraining,
                icon: AlertTriangle,
                color: '#e11d48',
                bgIcon: '#fff1f2',
                sub: 'Perlu pelatihan ulang',
              },
              {
                label: 'RATA-RATA SKOR',
                value: summaryMetrics.rataRataSkor,
                icon: Gauge,
                color: '#4f46e5',
                bgIcon: '#eef2ff',
                sub: 'Skala nilai 0 - 100',
              },
            ].map(({ label, value, icon: Icon, color, bgIcon, sub }) => (
              <Grid item xs={12} sm={6} lg={3} key={label}>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        color: tokens.colors.text.secondary,
                      }}
                    >
                      {label}
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '10px',
                        bgcolor: bgIcon,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} color={color} />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        color,
                        fontSize: { xs: '1.5rem', sm: '1.75rem' },
                        lineHeight: 1.2,
                      }}
                    >
                      {value}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: tokens.colors.text.tertiary, mt: 0.5, display: 'block' }}
                    >
                      {sub}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Compact Filters Toolbar */}
        <Paper
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)',
            bgcolor: '#ffffff',
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex flex-col flex-1 min-w-[220px]">
              <label className="mb-1 text-xs font-semibold text-slate-600">Pencarian</label>
              <TextField
                id="history-search"
                size="small"
                placeholder="Cari no. dokumen / ID / nama peserta / no. polisi / no. body..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color={tokens.colors.text.tertiary} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: '#ffffff',
                  '& .MuiOutlinedInput-root': { borderRadius: '12px' },
                }}
              />
            </div>

            {/* Filter Jenis Assessment */}
            <div className="flex flex-col w-[170px]">
              <label className="mb-1 text-xs font-semibold text-slate-600">Jenis Assessment</label>
              <FormControl size="small">
                <Select
                  id="filter-type"
                  value={filterType}
                  displayEmpty
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{ borderRadius: '12px', bgcolor: '#ffffff' }}
                >
                  <MenuItem value="">Semua Jenis</MenuItem>
                  {types.map((t) => (
                    <MenuItem key={t} value={t}>{getAssessmentDisplayName(t)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>

            {/* Filter Result */}
            <div className="flex flex-col w-[130px]">
              <label className="mb-1 text-xs font-semibold text-slate-600">Hasil</label>
              <FormControl size="small">
                <Select
                  id="filter-result"
                  value={filterResult}
                  displayEmpty
                  onChange={(e) => setFilterResult(e.target.value)}
                  sx={{ borderRadius: '12px', bgcolor: '#ffffff' }}
                >
                  <MenuItem value="">Semua Hasil</MenuItem>
                  <MenuItem value="PASS">PASS</MenuItem>
                  <MenuItem value="FAIL">FAIL</MenuItem>
                  <MenuItem value="DISQUALIFIED">DISQUALIFIED</MenuItem>
                </Select>
              </FormControl>
            </div>

            {/* Awal Periode */}
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-slate-600">Awal Periode</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Awal Periode"
                className="h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
              />
            </div>

            {/* Akhir Periode */}
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-semibold text-slate-600">Akhir Periode</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Akhir Periode"
                className="h-[40px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
              />
            </div>

            {/* Tombol Reset Filter */}
            {(search || filterType || filterResult || startDate || endDate) && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearch('');
                  setFilterType('');
                  setFilterResult('');
                  setStartDate('');
                  setEndDate('');
                }}
                sx={{
                  height: 40,
                  borderRadius: '12px',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc', color: '#334155' },
                }}
              >
                Reset Filter
              </Button>
            )}
          </div>
        </Paper>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Table */}
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Tanggal</TableCell>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Peserta & No. Dokumen</TableCell>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Program & Assessment</TableCell>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Unit Kendaraan</TableCell>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Instruktur & Lokasi</TableCell>
                  <TableCell align="right" className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Nilai</TableCell>
                  <TableCell align="center" className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Status</TableCell>
                  <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>Catatan Trainer</TableCell>
                  <TableCell align="right" className="whitespace-nowrap min-w-[148px] w-36" sx={{ width: 148, minWidth: 148, whiteSpace: 'nowrap', fontWeight: 700 }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j} className="whitespace-nowrap"><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                )}

                {!loading && !error && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
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

                {!loading && paginatedData.map((row) => {
                  const isDraftOrInProgress =
                    (row.status as string) === 'DRAFT' ||
                    (row.status as string) === 'IN_PROGRESS' ||
                    (row.result as string) === 'DRAFT' ||
                    (row.result as string) === 'IN_PROGRESS';

                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                      onClick={() => {
                        if (isDraftOrInProgress) {
                          router.push(`/assessment/edit/${row.id}`);
                        } else {
                          router.push(`/assessment/history/${row.id}`);
                        }
                      }}
                    >
                      {/* Kolom 1: Tanggal */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap', color: tokens.colors.text.secondary, fontSize: '0.8125rem' }}>
                        {formatDate(row.assessmentDate)}
                      </TableCell>

                      {/* Kolom 2: Peserta & No. Dokumen */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <div className="font-semibold text-slate-900 leading-tight capitalize">
                          {formatPersonName(row.participantName)}
                        </div>
                        <span className="mt-1 inline-block font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 tracking-tight whitespace-nowrap">
                          {formatAuditDocNumber(row.id, row.assessmentType, row.assessmentDate)}
                        </span>
                      </TableCell>

                      {/* Kolom 3: Program & Assessment */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                          <span className="font-medium text-xs text-slate-700 whitespace-nowrap">
                            {getTrainingProgramLabel(row.trainingProgram)}
                          </span>
                          <span className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {getAssessmentDisplayName(row.assessmentType)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Kolom 4: Unit Kendaraan */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <div className="font-mono text-xs font-bold text-slate-800 tracking-tight whitespace-nowrap">
                          {formatVehicleIdentifier(row.licensePlate, isForkliftRow(row))}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          {row.vehicleType || (isForkliftRow(row) ? 'Forklift' : 'Truk')}
                        </div>
                      </TableCell>

                      {/* Kolom 5: Instruktur & Lokasi */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <div className="text-sm font-semibold text-slate-800 whitespace-nowrap leading-tight capitalize">
                          {formatPersonName(row.instructor) || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap mt-0.5">
                          {row.testLocation || '—'}
                        </div>
                      </TableCell>

                      {/* Kolom 6: Nilai */}
                      <TableCell align="right" className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <span className="text-sm font-bold text-slate-800">
                          {isDraftOrInProgress ? '—' : parseFloat(String(row.score)).toFixed(1)}
                        </span>
                      </TableCell>

                      {/* Kolom 7: Status */}
                      <TableCell align="center" className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        <ResultBadge result={row.result} />
                      </TableCell>

                      {/* Kolom 8: Catatan Trainer */}
                      <TableCell className="whitespace-nowrap" sx={{ whiteSpace: 'nowrap' }}>
                        {(() => {
                          const note = cleanTrainerNotes(row.trainerNotes || row.notes);
                          if (!note) {
                            return <span className="text-slate-400 font-medium">-</span>;
                          }
                          return (
                            <div
                              className="max-w-[200px] truncate text-xs text-slate-600"
                              title={note}
                            >
                              {note}
                            </div>
                          );
                        })()}
                      </TableCell>

                      {/* Kolom 9: Aksi */}
                      <TableCell align="right" className="whitespace-nowrap min-w-[148px] w-36" sx={{ width: 148, minWidth: 148, whiteSpace: 'nowrap' }}>
                        <div className="flex items-center justify-end gap-1 flex-nowrap whitespace-nowrap">
                          <Tooltip title="Lihat detail">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/assessment/history/${row.id}`);
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                              sx={{ p: 0.75, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' } }}
                              aria-label={`View detail ${formatPersonName(row.participantName)}`}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cetak Hard Copy / PDF">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/assessment/history/${row.id}?print=true`, '_blank');
                              }}
                              className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                              sx={{ p: 0.75, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#1e293b' } }}
                              aria-label={`Print ${formatPersonName(row.participantName)}`}
                            >
                              <PrintIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {isDraftOrInProgress ? (
                            <Tooltip title="Lanjutkan Penilaian">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/assessment/edit/${row.id}`);
                                }}
                                className="p-1.5 hover:bg-teal-50 rounded text-teal-600 transition-colors"
                                sx={{
                                  p: 0.75,
                                  color: '#0d9488',
                                  '&:hover': { bgcolor: '#f0fdfa' },
                                }}
                                aria-label={`Lanjutkan Penilaian ${formatPersonName(row.participantName)}`}
                              >
                                <Play size={16} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Edit / Revisi Data">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/assessment/edit/${row.id}`);
                                }}
                                className="p-1.5 hover:bg-amber-50 rounded text-amber-600 transition-colors"
                                sx={{ p: 0.75, color: '#d97706', '&:hover': { bgcolor: '#fffbeb' } }}
                                aria-label={`Edit ${formatPersonName(row.participantName)}`}
                              >
                                <Pencil size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Hapus">
                            <IconButton
                              size="small"
                              onClick={(e) => handleDelete(row.id, e)}
                              className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                              sx={{ p: 0.75, color: '#64748b', '&:hover': { bgcolor: '#fef2f2', color: '#dc2626' } }}
                              aria-label={`Delete ${formatPersonName(row.participantName)}`}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {!loading && !error && filtered.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 3,
                px: 1,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                Menampilkan{' '}
                <Box component="span" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                  {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)}
                </Box>{' '}
                dari{' '}
                <Box component="span" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                  {filtered.length}
                </Box>{' '}
                data
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  typeof p === 'number' ? (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition ${
                        p === currentPage
                          ? 'bg-blue-600 font-bold text-white shadow-sm'
                          : 'border border-slate-200 bg-white font-medium text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-9 w-9 items-center justify-center text-xs font-medium text-slate-400"
                    >
                      {p}
                    </span>
                  )
                )}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </AppShell>
  );
}
