'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Plus,
  Trash2,
  Copy,
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  UserCheck,
  Check,
} from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import {
  TEST_LOCATIONS,
  SIM_CATEGORIES,
  TRUCK_SIM_CATEGORIES,
  FORKLIFT_LICENSE_OPTIONS,
  TRUCK_FLEET_TYPES,
  VEHICLE_TYPES,
  INSTRUCTORS,
  SIO_KEMNAKER_OPTIONS,
} from '@/components/assessment/AssessmentHeader';
import { isForkliftAssessment, TRAINING_PROGRAM_OPTIONS, getTrainingProgramLabel, formatVehicleIdentifier, formatPersonName } from '@/lib/assessment';
import type { AssessmentType } from '@/lib/assessment';

export interface BatchParticipantItem {
  id: string;
  namaPeserta: string;
  umur: string | number;
  noPolisi: string;
  golSIM: string;
  masaBerlakuSIM: string;
  sioKemnaker: string;
}

export interface SharedBatchHeader {
  tanggal: string;
  lokasiTest: string;
  instruktur: string;
  trainingProgram: string;
  jenisKendaraan: string;
  assessmentType: AssessmentType;
}

export const BATCH_TRAINING_PROGRAMS = TRAINING_PROGRAM_OPTIONS;

export const ASSESSMENT_TYPE_OPTIONS: Array<{ value: AssessmentType; label: string; vehicle: 'Truk' | 'Forklift' }> = [
  { value: 'DDT', label: 'Truck Assessment DDT (100 Poin)', vehicle: 'Truk' },
  { value: 'TMMIN_STANDARD', label: 'Forklift - Standard (134 Poin)', vehicle: 'Forklift' },
  { value: 'TMMIN_REFRESHMENT', label: 'Forklift - Refreshment (277 Poin)', vehicle: 'Forklift' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_PARTICIPANTS: BatchParticipantItem[] = [
  {
    id: generateId(),
    namaPeserta: '',
    umur: '',
    noPolisi: '',
    golSIM: 'SIM B2 Umum',
    masaBerlakuSIM: '',
    sioKemnaker: 'Ada Terdaftar',
  },
  {
    id: generateId(),
    namaPeserta: '',
    umur: '',
    noPolisi: '',
    golSIM: 'SIM B1 Umum',
    masaBerlakuSIM: '',
    sioKemnaker: 'Ada Terdaftar',
  },
  {
    id: generateId(),
    namaPeserta: '',
    umur: '',
    noPolisi: '',
    golSIM: 'SIM A',
    masaBerlakuSIM: '',
    sioKemnaker: 'Tidak ada',
  },
];

export default function BatchAssessmentForm() {
  const router = useRouter();

  // Shared Session Header State
  const [sharedHeader, setSharedHeader] = useState<SharedBatchHeader>({
    tanggal: new Date().toISOString().split('T')[0],
    lokasiTest: 'CCR CIBITUNG 1',
    instruktur: 'Yayan',
    trainingProgram: 'NEOP',
    jenisKendaraan: 'CDD',
    assessmentType: 'DDT',
  });

  // Dynamic detection for Forklift unit
  const isForklift = useMemo(() => {
    return Boolean(
      isForkliftAssessment(sharedHeader.assessmentType) ||
      sharedHeader.jenisKendaraan.toLowerCase().includes('forklift') ||
      sharedHeader.assessmentType !== 'DDT' ||
      sharedHeader.trainingProgram.toLowerCase().includes('forklift')
    );
  }, [sharedHeader.jenisKendaraan, sharedHeader.assessmentType, sharedHeader.trainingProgram]);

  // Participant Roster State
  const [participants, setParticipants] = useState<BatchParticipantItem[]>(INITIAL_PARTICIPANTS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Import Dialog State
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTab, setImportTab] = useState(0); // 0 = CSV File, 1 = Paste Spreadsheet
  const [pasteRawText, setPasteRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<BatchParticipantItem[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [importError, setImportError] = useState<string | null>(null);

  // Update shared header and auto-adapt assessment type when vehicle changes, and vice-versa
  const handleSharedHeaderChange = (field: keyof SharedBatchHeader, value: string) => {
    setSharedHeader((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'jenisKendaraan') {
        if (value.toLowerCase().includes('forklift')) {
          if (next.assessmentType === 'DDT') {
            next.assessmentType = 'TMMIN_STANDARD';
          }
        } else {
          next.assessmentType = 'DDT';
        }
      } else if (field === 'assessmentType') {
        if (value === 'DDT') {
          next.jenisKendaraan = prev.jenisKendaraan && prev.jenisKendaraan !== 'Forklift' ? prev.jenisKendaraan : 'CDD';
        } else {
          next.jenisKendaraan = 'Forklift';
        }
      }
      return next;
    });

    // If changing between Forklift and Truck DDT, automatically convert participants' golSIM
    if (field === 'assessmentType' || field === 'jenisKendaraan') {
      const willBeForklift =
        (field === 'assessmentType' && value !== 'DDT') ||
        (field === 'jenisKendaraan' && value.toLowerCase().includes('forklift'));

      setParticipants((prev) =>
        prev.map((p) => {
          if (willBeForklift && (!p.golSIM || p.golSIM.startsWith('SIM '))) {
            return { ...p, golSIM: 'SIO Disnaker / Kemnaker' };
          }
          if (!willBeForklift && (!p.golSIM || p.golSIM.includes('SIO'))) {
            return { ...p, golSIM: 'SIM B2 Umum' };
          }
          return p;
        })
      );
    }
  };

  // Participant Row Helpers
  const updateParticipant = (
    indexOrId: number | string,
    field: keyof BatchParticipantItem,
    value: any
  ) => {
    setParticipants((prev) =>
      prev.map((item, idx) => {
        if (typeof indexOrId === 'number' ? idx === indexOrId : item.id === indexOrId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleParticipantChange = (
    id: string,
    field: keyof BatchParticipantItem,
    value: any
  ) => {
    updateParticipant(id, field, value);
  };

  const handleAddParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        id: generateId(),
        namaPeserta: '',
        umur: '',
        noPolisi: '',
        golSIM: isForklift ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum',
        masaBerlakuSIM: '',
        sioKemnaker: isForklift ? 'Ada Terdaftar' : 'Tidak ada',
      },
    ]);
  };

  const handleDuplicateParticipant = (id: string) => {
    const target = participants.find((p) => p.id === id);
    if (!target) return;
    setParticipants((prev) => [
      ...prev,
      {
        ...target,
        id: generateId(),
        namaPeserta: `${target.namaPeserta} (Copy)`,
      },
    ]);
  };

  const handleDeleteParticipant = (id: string) => {
    if (participants.length <= 1) {
      // Clear instead of removing last row
      setParticipants([
        {
          id: generateId(),
          namaPeserta: '',
          umur: '',
          noPolisi: '',
          golSIM: isForklift ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum',
          masaBerlakuSIM: '',
          sioKemnaker: isForklift ? 'Ada Terdaftar' : 'Tidak ada',
        },
      ]);
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearRoster = () => {
    if (window.confirm('Kosongkan semua data peserta pada daftar roster?')) {
      setParticipants([
        {
          id: generateId(),
          namaPeserta: '',
          umur: '',
          noPolisi: '',
          golSIM: isForklift ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum',
          masaBerlakuSIM: '',
          sioKemnaker: isForklift ? 'Ada Terdaftar' : 'Tidak ada',
        },
      ]);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'Nama Peserta,Umur,No Polisi / No Unit,Golongan SIM,Masa Berlaku SIM,SIO Kemnaker\n' +
      'Ahmad Fauzi,28,B 1234 ABC,SIM B2 Umum,2027-12-31,Ada Terdaftar\n' +
      'Budi Santoso,32,B 5678 XYZ,SIM B1 Umum,2026-06-15,Ada Tidak Terdaftar\n' +
      'Candra Wijaya,25,FL-02,SIO Disnaker / Kemnaker,2028-10-20,Ada Terdaftar\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_batch_peserta_neop.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to split CSV/TSV line respecting quoted values
  const splitCsvLine = (line: string, delimiter: string): string[] => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.replace(/^["']|["']$/g, '').trim());
    }
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.replace(/^["']|["']$/g, '').trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.replace(/^["']|["']$/g, '').trim());
    return result;
  };

  // CSV / TSV Parsing Logic
  const parseRowsFromText = (text: string): BatchParticipantItem[] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) return [];

    const result: BatchParticipantItem[] = [];

    // Detect delimiter: tab (\t), semicolon (;), or comma (,)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    // Check if first row is header
    const lowerFirst = firstLine.toLowerCase();
    const hasHeader =
      lowerFirst.includes('nama') ||
      lowerFirst.includes('name') ||
      lowerFirst.includes('peserta') ||
      lowerFirst.includes('umur');

    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const row = lines[i];
      const cols = splitCsvLine(row, delimiter);
      if (cols.length === 0 || !cols[0]) continue;

      const nama = cols[0] || '';
      const umur = cols[1] || '';
      const noPol = cols[2] || '';
      let golSim = cols[3] || (isForklift ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum');
      const masaSim = cols[4] || '';
      let sio = cols[5] || (isForklift ? 'Ada Terdaftar' : 'Tidak ada');

      // Match SIM / SIO options
      if (golSim) {
        const foundTruck = TRUCK_SIM_CATEGORIES.find(
          (s) => s.value.toLowerCase() === golSim.toLowerCase()
        );
        const foundForklift = FORKLIFT_LICENSE_OPTIONS.find(
          (s) => s.value.toLowerCase() === golSim.toLowerCase()
        );
        if (foundTruck) golSim = foundTruck.value;
        else if (foundForklift) golSim = foundForklift.value;
      }

      // Match SIO options
      if (sio) {
        const foundSio = SIO_KEMNAKER_OPTIONS.find(
          (s) => s.value.toLowerCase() === sio.toLowerCase()
        );
        if (foundSio) sio = foundSio.value;
      }

      result.push({
        id: generateId(),
        namaPeserta: nama,
        umur,
        noPolisi: noPol,
        golSIM: golSim,
        masaBerlakuSIM: masaSim,
        sioKemnaker: sio,
      });
    }

    return result;
  };

  // Handle File Input (.csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parseRowsFromText(content);
      if (parsed.length === 0) {
        setImportError('File tidak berisi data peserta yang valid atau kosong.');
      } else {
        setParsedPreview(parsed);
      }
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file CSV.');
    };
    reader.readAsText(file);
  };

  // Handle Raw Textarea Change (Paste from Excel)
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteRawText(val);
    setImportError(null);
    if (!val.trim()) {
      setParsedPreview([]);
      return;
    }
    const parsed = parseRowsFromText(val);
    setParsedPreview(parsed);
  };

  // Apply Imported Rows into Main Roster
  const handleApplyImport = () => {
    if (parsedPreview.length === 0) {
      setImportError('Tidak ada data yang dapat diimpor.');
      return;
    }

    if (importMode === 'replace') {
      setParticipants(parsedPreview);
    } else {
      // Append, filter out empty rows if only 1 empty row existed
      const currentFiltered = participants.filter((p) => p.namaPeserta.trim().length > 0);
      setParticipants([...currentFiltered, ...parsedPreview]);
    }

    // Reset and close dialog
    setImportDialogOpen(false);
    setParsedPreview([]);
    setPasteRawText('');
    setImportError(null);
  };

  // Valid participants count
  const validParticipants = useMemo(() => {
    return participants.filter((p) => p.namaPeserta.trim().length > 0);
  }, [participants]);

  // Submit Handler: Create Batch Assessments in Database
  const handleSubmitBatch = async () => {
    setErrorMsg(null);

    if (validParticipants.length === 0) {
      setErrorMsg('Harap isi minimal 1 nama peserta pada daftar roster.');
      return;
    }

    setIsSubmitting(true);

    try {
      const sanitizedParticipants = validParticipants.map((p) => ({
        ...p,
        namaPeserta: formatPersonName(p.namaPeserta),
        noPolisi: p.noPolisi ? formatVehicleIdentifier(p.noPolisi, isForklift) : '',
      }));

      const res = await fetch('/api/assessments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharedHeader: {
            ...sharedHeader,
            instruktur: formatPersonName(sharedHeader.instruktur),
          },
          participants: sanitizedParticipants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat sesi batch assessment');
      }

      const createdItems: Array<{ id: string; participantName: string }> = data.created || [];

      if (createdItems.length === 0) {
        throw new Error('Tidak ada data asesmen yang berhasil dibuat.');
      }

      // Store batch session in sessionStorage for smooth multi-participant navigation
      const sessionData = {
        batchId: `BATCH-${Date.now()}`,
        program: sharedHeader.trainingProgram || 'NEOP',
        sharedHeader,
        items: createdItems.map((c: any) => ({
          id: c.id,
          name: c.participantName,
          unit: c.licensePlate || '-',
        })),
      };

      try {
        sessionStorage.setItem('slec_batch_session', JSON.stringify(sessionData));
      } catch (e) {
        console.warn('Failed to write batch session to sessionStorage:', e);
      }

      // Build batch IDs query parameter
      const batchIdsParam = createdItems.map((c) => c.id).join(',');
      const firstId = createdItems[0].id;

      // Redirect directly to first participant's assessment sheet with batch navigation context
      router.push(`/assessment/edit/${firstId}?batch=1&batchIds=${batchIdsParam}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat membuat sesi batch.');
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Informative Banner */}
      <Paper
        sx={{
          p: 2.5,
          border: `1.5px solid ${tokens.colors.primary}`,
          bgcolor: '#f0fdfa',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: tokens.colors.primary,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={24} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: tokens.colors.primaryDark, mb: 0.5 }}>
              Batch Assessment & Roster Input (Sesi Massal NEOP)
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
              Input data sesi bersama (Tanggal, Lokasi, Instruktur, Jenis Unit, Program) satu kali saja, lalu masukkan daftar peserta secara manual atau impor dari spreadsheet Excel. Sistem akan membuat draft asesmen otomatis untuk setiap peserta.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Bagian 1: Shared Session Data */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, pb: 1.5, borderBottom: `1px solid ${tokens.colors.border}` }}>
          <Calendar size={20} color={tokens.colors.primary} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
            1. Data Sesi Pengujian Bersama (Shared Session Data)
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {/* Tanggal Uji */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              label="Tanggal Pelaksanaan Uji"
              type="date"
              size="small"
              fullWidth
              value={sharedHeader.tanggal}
              onChange={(e) => handleSharedHeaderChange('tanggal', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Tanggal serentak asesmen batch"
            />
          </Grid>

          {/* Lokasi Test */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Lokasi Pengujian"
              size="small"
              fullWidth
              value={sharedHeader.lokasiTest}
              onChange={(e) => handleSharedHeaderChange('lokasiTest', e.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              {TEST_LOCATIONS.map((loc) => (
                <MenuItem key={loc.value} value={loc.value}>
                  {loc.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Instruktur / Penguji */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Instruktur / Penguji"
              size="small"
              fullWidth
              value={sharedHeader.instruktur}
              onChange={(e) => handleSharedHeaderChange('instruktur', e.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              {INSTRUCTORS.map((ins) => (
                <MenuItem key={ins.value} value={ins.value}>
                  {ins.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Program Training */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Program Training"
              size="small"
              fullWidth
              value={sharedHeader.trainingProgram}
              onChange={(e) => handleSharedHeaderChange('trainingProgram', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Default: NEOP untuk driver / operator baru"
            >
              {BATCH_TRAINING_PROGRAMS.map((prog) => (
                <MenuItem key={prog.value} value={prog.value}>
                  {prog.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Jenis Kendaraan / Tipe Armada */}
          <Grid item xs={12} sm={6} md={4}>
            {isForklift ? (
              <TextField
                label="Jenis Kendaraan / Unit"
                size="small"
                fullWidth
                disabled
                value="Forklift"
                InputLabelProps={{ shrink: true }}
                helperText="Terkunci otomatis untuk asesmen Forklift"
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-root': { bgcolor: '#f1f5f9', cursor: 'not-allowed' },
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: tokens.colors.text.primary,
                    fontWeight: 600,
                  },
                }}
              />
            ) : (
              <TextField
                select
                label="Tipe Armada / Jenis Kendaraan"
                size="small"
                fullWidth
                value={sharedHeader.jenisKendaraan}
                onChange={(e) => handleSharedHeaderChange('jenisKendaraan', e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Pilih tipe armada truk yang diujikan (Master SENDA)"
              >
                {TRUCK_FLEET_TYPES.map((v) => (
                  <MenuItem key={v.value} value={v.value}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>

          {/* Jenis Penilaian */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              select
              label="Format Form Penilaian Asesmen"
              size="small"
              fullWidth
              value={sharedHeader.assessmentType}
              onChange={(e) => handleSharedHeaderChange('assessmentType', e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Menentukan standar checklist asesmen"
            >
              {ASSESSMENT_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Bagian 2: Daftar Peserta Roster */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 2.5,
            pb: 1.5,
            borderBottom: `1px solid ${tokens.colors.border}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <UserCheck size={20} color={tokens.colors.primary} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
              2. Daftar Roster Peserta ({participants.length} Baris)
            </Typography>
            <Chip
              label={`${validParticipants.length} Peserta Valid`}
              color={validParticipants.length > 0 ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>

          {/* Quick Action Tools */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={15} />}
              onClick={handleDownloadTemplate}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Unduh Template CSV
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<FileSpreadsheet size={15} />}
              onClick={() => setImportDialogOpen(true)}
              sx={{
                bgcolor: '#0f766e',
                '&:hover': { bgcolor: '#115e59' },
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Import dari Excel / CSV
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleClearRoster}
              sx={{ textTransform: 'none' }}
            >
              Kosongkan
            </Button>
          </Box>
        </Box>

        {/* Dynamic Table */}
        <Box sx={{ overflowX: 'auto', border: `1px solid ${tokens.colors.border}`, borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 950 }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ width: 45, fontWeight: 700, textAlign: 'center' }}>No</TableCell>
                <TableCell sx={{ minWidth: 200, fontWeight: 700 }}>
                  Nama Peserta <span style={{ color: '#ef4444' }}>*</span>
                </TableCell>
                <TableCell sx={{ width: 95, minWidth: 80, fontWeight: 700, textAlign: 'center' }}>
                  Umur
                </TableCell>
                <TableCell sx={{ minWidth: 180, fontWeight: 700 }}>
                  {isForklift ? 'No. Body' : 'No. Polisi'} <span style={{ color: '#ef4444' }}>*</span>
                </TableCell>
                <TableCell sx={{ minWidth: 150, fontWeight: 700 }}>
                  {isForklift ? 'Lisensi SIO' : 'Gol. SIM'}
                </TableCell>
                <TableCell sx={{ minWidth: 150, fontWeight: 700 }}>
                  {isForklift ? 'Masa Berlaku SIO' : 'Masa Berlaku SIM'}
                </TableCell>
                <TableCell sx={{ minWidth: 160, fontWeight: 700 }}>
                  {isForklift ? 'Status SIO Disnaker' : 'SIO Kemnaker'}
                </TableCell>
                <TableCell sx={{ width: 90, fontWeight: 700, textAlign: 'center' }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map((item, index) => {
                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      '&:nth-of-type(even)': { bgcolor: '#fcfdfd' },
                      '&:hover': { bgcolor: '#f1f5f9' },
                    }}
                  >
                    <TableCell sx={{ textAlign: 'center', fontWeight: 600, color: tokens.colors.text.secondary }}>
                      {index + 1}
                    </TableCell>

                    {/* Nama Peserta */}
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Nama Lengkap Peserta"
                        value={item.namaPeserta}
                        onChange={(e) => handleParticipantChange(item.id, 'namaPeserta', e.target.value)}
                        onBlur={() => {
                          if (item.namaPeserta) {
                            const formatted = formatPersonName(item.namaPeserta);
                            if (formatted !== item.namaPeserta) {
                              handleParticipantChange(item.id, 'namaPeserta', formatted);
                            }
                          }
                        }}
                        error={participants.length > 1 && item.namaPeserta.trim().length === 0}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </TableCell>

                    {/* Umur */}
                    <TableCell sx={{ width: 95, minWidth: 80, textAlign: 'center' }}>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Thn"
                        value={item.umur}
                        onChange={(e) =>
                          updateParticipant(
                            index,
                            'umur',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        inputProps={{
                          min: 15,
                          max: 99,
                          style: { textAlign: 'center' },
                        }}
                        sx={{
                          bgcolor: '#ffffff',
                          width: '100%',
                          minWidth: 70,
                          '& input': {
                            textAlign: 'center',
                            MozAppearance: 'textfield',
                            '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0,
                            },
                          },
                        }}
                      />
                    </TableCell>

                    {/* No. Polisi / No. Body */}
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder={isForklift ? 'Contoh: FL-01 atau FL-02' : 'Contoh: B 1234 XYZ'}
                        value={item.noPolisi}
                        onChange={(e) => handleParticipantChange(item.id, 'noPolisi', e.target.value.toUpperCase())}
                        onBlur={() => {
                          if (item.noPolisi) {
                            const formatted = formatVehicleIdentifier(item.noPolisi, isForklift);
                            if (formatted !== '—' && formatted !== item.noPolisi) {
                              handleParticipantChange(item.id, 'noPolisi', formatted);
                            }
                          }
                        }}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </TableCell>

                    {/* Golongan SIM / Lisensi SIO */}
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={item.golSIM || (isForklift ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum')}
                        onChange={(e) => handleParticipantChange(item.id, 'golSIM', e.target.value)}
                        sx={{ bgcolor: '#ffffff' }}
                      >
                        {isForklift ? (
                          FORKLIFT_LICENSE_OPTIONS.map((cat) => (
                            <MenuItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </MenuItem>
                          ))
                        ) : (
                          TRUCK_SIM_CATEGORIES.map((s) => (
                            <MenuItem key={s.value} value={s.value}>
                              {s.label}
                            </MenuItem>
                          ))
                        )}
                      </TextField>
                    </TableCell>

                    {/* Masa Berlaku SIM */}
                    <TableCell>
                      <TextField
                        type="date"
                        size="small"
                        fullWidth
                        value={item.masaBerlakuSIM || ''}
                        onChange={(e) => handleParticipantChange(item.id, 'masaBerlakuSIM', e.target.value)}
                        disabled={item.golSIM === 'Tidak Ada'}
                        InputLabelProps={{ shrink: true }}
                        sx={{ bgcolor: '#ffffff' }}
                      />
                    </TableCell>

                    {/* SIO Kemnaker */}
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={item.sioKemnaker || 'Tidak ada'}
                        onChange={(e) => handleParticipantChange(item.id, 'sioKemnaker', e.target.value)}
                        sx={{
                          bgcolor: isForklift && item.sioKemnaker.includes('Ada') ? '#f0fdf4' : '#ffffff',
                        }}
                      >
                        {SIO_KEMNAKER_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>

                    {/* Action buttons */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <Tooltip title="Duplikasi Baris">
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicateParticipant(item.id)}
                            sx={{ color: tokens.colors.text.secondary }}
                          >
                            <Copy size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Hapus Baris">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteParticipant(item.id)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>

        {/* Add Row Button */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={handleAddParticipant}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              borderColor: tokens.colors.primary,
              color: tokens.colors.primary,
              '&:hover': {
                borderColor: tokens.colors.primaryDark,
                bgcolor: '#f0fdfa',
              },
            }}
          >
            + Tambah Peserta
          </Button>
        </Box>
      </Paper>

      {/* Error Alert */}
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg(null)} icon={<AlertCircle size={20} />}>
          {errorMsg}
        </Alert>
      )}

      {/* Bottom Final Action Bar */}
      <Paper
        sx={{
          p: 2.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          bgcolor: '#f8fafc',
          border: `1.5px solid ${tokens.colors.border}`,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
            Siap Membuat Sesi Batch: {validParticipants.length} Peserta Terdaftar
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
            Program: <strong>{sharedHeader.trainingProgram}</strong> &bull; Unit: <strong>{sharedHeader.jenisKendaraan}</strong> &bull; Instruktur: <strong>{sharedHeader.instruktur}</strong>
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          disabled={isSubmitting || validParticipants.length === 0}
          onClick={handleSubmitBatch}
          startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <Users size={18} />}
          sx={{
            px: 4,
            py: 1.25,
            fontWeight: 700,
            fontSize: '1rem',
            textTransform: 'none',
            bgcolor: tokens.colors.primary,
            '&:hover': { bgcolor: tokens.colors.primaryDark },
          }}
        >
          {isSubmitting
            ? 'Membuat Sesi Batch...'
            : `Buat Sesi Batch Assessment (${validParticipants.length} Peserta)`}
        </Button>
      </Paper>

      {/* ============================================================== */}
      {/* MODAL DIALOG: IMPORT DARI EXCEL / CSV                         */}
      {/* ============================================================== */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ pb: 1, borderBottom: `1px solid ${tokens.colors.borderLight}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <FileSpreadsheet size={22} color={tokens.colors.primary} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Import Data Peserta dari Excel / CSV
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          {/* Tab Selection */}
          <Tabs
            value={importTab}
            onChange={(_, val) => setImportTab(val)}
            sx={{ mb: 2.5, borderBottom: `1px solid ${tokens.colors.border}` }}
          >
            <Tab label="1. Paste dari Excel / Spreadsheet" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="2. Upload File CSV (.csv)" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          {/* Tab 1: Paste from Excel */}
          {importTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                Pilih dan salin (Copy Ctrl+C) tabel peserta dari Microsoft Excel atau Google Sheets, lalu tempel (Paste Ctrl+V) pada kotak di bawah:
              </Typography>
              <TextField
                multiline
                rows={6}
                fullWidth
                placeholder={'Nama Peserta\tUmur\tNo. Polisi\tGol SIM\tMasa Berlaku\tSIO Kemnaker\nAhmad Fauzi\t28\tB 1234 ABC\tSIM B2 Umum\t2027-12-31\tAda Terdaftar\nBudi Santoso\t32\tB 5678 XYZ\tSIM B1 Umum\t2026-06-15\tAda Tidak Terdaftar'}
                value={pasteRawText}
                onChange={handlePasteChange}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  bgcolor: '#f8fafc',
                }}
              />
            </Box>
          )}

          {/* Tab 2: Upload File CSV */}
          {importTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, border: `2px dashed ${tokens.colors.border}`, borderRadius: 2, bgcolor: '#fafafa' }}>
              <Upload size={36} color={tokens.colors.primary} style={{ marginBottom: 12 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Pilih file CSV / Spreadsheet dari komputer Anda
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, mb: 2 }}>
                Format didukung: File .CSV, .TSV, .TXT dengan separator koma (,), titik-koma (;), atau tab
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<Upload size={16} />}
                sx={{ textTransform: 'none', bgcolor: tokens.colors.primary }}
              >
                Pilih File .CSV / .TSV
                <input type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values,.txt,text/plain" hidden onChange={handleFileUpload} />
              </Button>
            </Box>
          )}

          {/* Import Mode Option */}
          <Box sx={{ mt: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.colors.text.secondary }}>
              Mode Penggabungan:
            </Typography>
            <Chip
              label="Tambahkan ke Roster (Append)"
              clickable
              color={importMode === 'append' ? 'primary' : 'default'}
              onClick={() => setImportMode('append')}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label="Gantikan Roster (Replace All)"
              clickable
              color={importMode === 'replace' ? 'error' : 'default'}
              onClick={() => setImportMode('replace')}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {/* Error inside Dialog */}
          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {importError}
            </Alert>
          )}

          {/* Live Preview Table */}
          {parsedPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#047857' }}>
                  Preview Hasil Pembacaan ({parsedPreview.length} Peserta Terdeteksi):
                </Typography>
              </Box>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${tokens.colors.border}`, borderRadius: 1 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Nama</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Umur</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>Unit/NoPol</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>SIM</TableCell>
                      <TableCell sx={{ fontWeight: 700, py: 0.5 }}>SIO Kemnaker</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedPreview.slice(0, 15).map((p, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ py: 0.5 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 0.5 }}>{p.namaPeserta}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{p.umur || '—'}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{p.noPolisi || '—'}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{p.golSIM}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{p.sioKemnaker}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${tokens.colors.borderLight}` }}>
          <Button onClick={() => setImportDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Batal
          </Button>
          <Button
            variant="contained"
            disabled={parsedPreview.length === 0}
            onClick={handleApplyImport}
            startIcon={<Check size={16} />}
            sx={{
              bgcolor: tokens.colors.primary,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            Terapkan ke Roster ({parsedPreview.length} Peserta)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
