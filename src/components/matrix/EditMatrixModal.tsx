'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
} from '@mui/material';
import { X, Truck, Forklift, RotateCcw, Save, FileText } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import { calculateMatrixStats } from '@/lib/matrixCalculations';
import { formatPersonName, cleanTrainerNotes } from '@/lib/utils';
import type { MatrixDriver } from '@/types/matrix';

export interface EditMatrixModalProps {
  open: boolean;
  driver: MatrixDriver | null;
  onClose: () => void;
  onSuccess?: (updatedDriver: MatrixDriver) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onSaveSuccess?: (updatedDriver: MatrixDriver) => Promise<void> | void; // backward compatibility
}

const drivingAspects = [
  { code: 'D0', label: 'Analisis & Bahaya', description: 'Menganalisis dan melaporkan kondisi bahaya saat berkendara.' },
  { code: 'D1', label: 'Operasional Truk', description: 'Mengoperasikan truk dengan benar, stabil, dan aman.' },
  { code: 'D2', label: 'Kondisi Abnormal', description: 'Menangani situasi dan kondisi abnormal sesuai SOP pekerjaan.' },
  { code: 'D3', label: 'Rute & Dokumen', description: 'Melakukan pengiriman di berbagai rute dan pengisian dokumen resmi.' },
  { code: 'D4', label: 'PTI Truk', description: 'Melakukan pengecekan kendaraan sebelum & sesudah jalan (PTI).' },
];

const forkliftAspects = [
  { code: 'F0', label: 'Analisis Bahaya', description: 'Menganalisis dan melaporkan kondisi bahaya di area forklift.' },
  { code: 'F1', label: 'Operasional Forklift', description: 'Mengoperasikan forklift dengan benar, presisi, dan aman.' },
  { code: 'F2', label: 'Dasar Pemeliharaan', description: 'Memahami dasar pemeliharaan dan pengoperasian unit forklift.' },
  { code: 'F3', label: 'Aturan & SOP', description: 'Memahami dan menjalankan aturan keselamatan serta SOP yang berlaku.' },
  { code: 'F4', label: 'PTI Forklift', description: 'Melakukan pengecekan unit forklift harian (PTI & APD).' },
];

const scoreOptions = [
  { value: null, label: '—', text: 'Kosongkan / Belum diuji', color: '#94a3b8', bg: '#f1f5f9' },
  { value: 0, label: '0', text: '0 - Tidak tahu / tidak mampu', color: '#E31B23', bg: '#FDEAEA' },
  { value: 1, label: '1', text: '1 - Mengetahui dasar pekerjaan', color: '#1596B7', bg: '#E8F7FB' },
  { value: 2, label: '2', text: '2 - Mampu dengan pengawasan', color: '#D08A00', bg: '#FFF3D8' },
  { value: 3, label: '3', text: '3 - Mampu bekerja mandiri', color: '#9A9800', bg: '#FFFBD8' },
  { value: 4, label: '4', text: '4 - Sangat mahir / profesional', color: '#15965C', bg: '#E8F6ED' },
];

export default function EditMatrixModal({
  open,
  driver,
  onClose,
  onSuccess,
  onRefresh,
  onSaveSuccess,
}: EditMatrixModalProps) {
  const [activeTab, setActiveTab] = useState<'driving' | 'forklift'>('driving');
  const [scores, setScores] = useState<(number | null)[]>(new Array(10).fill(null));
  const [drivingNotes, setDrivingNotes] = useState<string>('');
  const [forkliftNotes, setForkliftNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inisialisasi skor & catatan kontekstual saat driver dibuka
  useEffect(() => {
    if (driver) {
      if (driver.aspectScores && driver.aspectScores.length === 10) {
        setScores([...driver.aspectScores]);
      } else {
        setScores(new Array(10).fill(null));
      }

      // Deteksi riwayat aspek driver
      const hasD = driver.aspectScores ? driver.aspectScores.slice(0, 5).some(s => s !== null && s !== undefined) : false;
      const hasF = driver.aspectScores ? driver.aspectScores.slice(5, 10).some(s => s !== null && s !== undefined) : false;
      const train = (driver.training || '').toUpperCase();
      const isTrainDdt = train.includes('DDT');
      const isTrainFork = train.includes('FORKLIFT') || train.includes('STAND') || train.includes('REFRESH');

      // Inisialisasi catatan Driving & Forklift (dibersihkan dari tag metadata sistem)
      let initDriving = cleanTrainerNotes(driver.drivingNotes);
      let initForklift = cleanTrainerNotes(driver.forkliftNotes);

      if (!initDriving && !initForklift && driver.notes) {
        const dMatch = driver.notes.match(/\[(?:Driving|DDT)\]\s*([^•\n]+)/i);
        const fMatch = driver.notes.match(/\[(?:Forklift|Forklift Refreshment|Forklift Standard)\]\s*([^•\n]+)/i);
        if (dMatch || fMatch) {
          initDriving = dMatch ? cleanTrainerNotes(dMatch[1]) : '';
          initForklift = fMatch ? cleanTrainerNotes(fMatch[1]) : '';
        } else if ((hasD || isTrainDdt) && !(hasF || isTrainFork)) {
          initDriving = cleanTrainerNotes(driver.notes);
        } else if ((hasF || isTrainFork) && !(hasD || isTrainDdt)) {
          initForklift = cleanTrainerNotes(driver.notes);
        } else {
          initDriving = cleanTrainerNotes(driver.notes);
        }
      }

      setDrivingNotes(initDriving || '');
      setForkliftNotes(initForklift || '');
      setErrorMsg(null);

      // Buka tab sesuai fokus training driver
      if ((hasF || isTrainFork) && !(hasD || isTrainDdt)) {
        setActiveTab('forklift');
      } else {
        setActiveTab('driving');
      }
    }
  }, [driver]);

  // Real-time recalculation (Client-safe)
  const liveStats = useMemo(() => calculateMatrixStats(scores), [scores]);

  const handleScoreChange = (index: number, value: number | null) => {
    setScores((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleResetToInitial = () => {
    if (driver && driver.aspectScores && driver.aspectScores.length === 10) {
      setScores([...driver.aspectScores]);
    } else {
      setScores(new Array(10).fill(null));
    }
    setDrivingNotes(cleanTrainerNotes(driver?.drivingNotes) || '');
    setForkliftNotes(cleanTrainerNotes(driver?.forkliftNotes) || '');
  };

  const handleSave = async () => {
    if (!driver) return;
    setIsSaving(true);
    setErrorMsg(null);

    const driverId = driver.id || driver.name;

    const effectiveDrivingNotes = cleanTrainerNotes(drivingNotes) || undefined;
    const effectiveForkliftNotes = cleanTrainerNotes(forkliftNotes) || undefined;

    let combinedNotes: string | undefined = undefined;
    if (effectiveDrivingNotes && effectiveForkliftNotes) {
      combinedNotes = `${effectiveDrivingNotes} • ${effectiveForkliftNotes}`;
    } else if (effectiveDrivingNotes) {
      combinedNotes = effectiveDrivingNotes;
    } else if (effectiveForkliftNotes) {
      combinedNotes = effectiveForkliftNotes;
    }

    try {
      const response = await fetch(`/api/matrix/${encodeURIComponent(driverId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId,
          driverName: driver.name,
          aspectScores: scores,
          avg: liveStats.avg,
          level: liveStats.level,
          notes: combinedNotes,
          drivingNotes: effectiveDrivingNotes,
          forkliftNotes: effectiveForkliftNotes,
        }),
      });

      if (!response.ok) {
        let errText = 'Gagal menyimpan perubahan ke server';
        try {
          const resJson = await response.json();
          if (resJson.error) errText = resJson.error;
        } catch (_) {}
        throw new Error(errText);
      }

      const updatedDriver: MatrixDriver = {
        ...driver,
        aspectScores: [...scores],
        level: liveStats.level,
        notes: combinedNotes,
        drivingNotes: effectiveDrivingNotes,
        forkliftNotes: effectiveForkliftNotes,
      };

      // 1. Eksekusi state mutation callback
      if (onSuccess) {
        await onSuccess(updatedDriver);
      } else if (onSaveSuccess) {
        await onSaveSuccess(updatedDriver);
      }

      // 2. Eksekusi refresh callback jika tersedia
      if (onRefresh) {
        await onRefresh();
      }

      // 3. Tutup modal setelah state terbarukan
      onClose();
    } catch (err: any) {
      console.error('[EditMatrixModal] Save error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  if (!driver) return null;

  const currentAspectList = activeTab === 'driving' ? drivingAspects : forkliftAspects;
  const offsetIndex = activeTab === 'driving' ? 0 : 5;

  const hasDrivingScores = Boolean(scores.slice(0, 5).some((s) => s !== null && s !== undefined));
  const hasForkliftScores = Boolean(scores.slice(5, 10).some((s) => s !== null && s !== undefined));
  const trainStr = (driver.training || '').toUpperCase();
  const isRefreshment = trainStr.includes('REFRESH');
  const isStandard = trainStr.includes('STAND');
  const forkliftSubLabel = isRefreshment ? 'Refreshment' : isStandard ? 'Standard' : 'Forklift';

  const isTrainDdt = trainStr.includes('DDT');
  const isTrainFork = trainStr.includes('FORKLIFT') || isStandard || isRefreshment;
  const isHybrid = (hasDrivingScores && hasForkliftScores) || (isTrainDdt && isTrainFork);

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: `${tokens.borderRadius.lg}px`,
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          p: 0,
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
                Edit Skill Matrix
              </Typography>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Manual Override
              </span>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Sesuaikan skor kompetensi driver pada aspek operasional (skala 0 - 4) dan catatan kemampuan.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            disabled={isSaving}
            size="small"
            sx={{
              color: '#64748b',
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              '&:hover': { bgcolor: '#f1f5f9' },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        {/* Driver Info & Live Preview Card */}
        <Box
          sx={{
            mx: 2.5,
            mb: 2.5,
            p: 2,
            bgcolor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          {/* Info Driver */}
          <Box>
            <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              Nama Driver
            </Typography>
            <Typography variant="subtitle1" className="capitalize" sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
              {formatPersonName(driver.name)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                Program:
              </Typography>
              {isHybrid ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    DDT
                  </span>
                  <span className="text-slate-400 font-bold text-xs">+</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-bold ${
                      isRefreshment
                        ? 'border-teal-200 bg-teal-50 text-teal-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {forkliftSubLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">(Hybrid Driver)</span>
                </Box>
              ) : hasForkliftScores ? (
                <span
                  className={`rounded border px-2 py-0.5 text-xs font-bold ${
                    isRefreshment
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {isRefreshment
                    ? 'Forklift (Refreshment)'
                    : isStandard
                    ? 'Forklift (Standard)'
                    : (driver.training || 'Forklift')}
                </span>
              ) : hasDrivingScores ? (
                <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                  {driver.training || 'DDT (Driving)'}
                </span>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {driver.training || 'Assessment'}
                </span>
              )}
            </Box>
          </Box>

          {/* Real-time Recalculation Preview */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              gap: 2,
              bgcolor: '#f8fafc',
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 600 }}>
                Skill (AVG)
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  color: liveStats.avg !== null ? '#1e293b' : '#94a3b8',
                }}
              >
                {liveStats.avg !== null ? liveStats.avg.toFixed(1) : '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                {liveStats.validCount}/10 terisi
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 600, mb: 0.5 }}>
                Level Hasil
              </Typography>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                  liveStats.level === 'Belum Dinilai'
                    ? 'border border-slate-200 bg-slate-100 text-slate-600'
                    : liveStats.level === 'Hijau'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : liveStats.level === 'Merah'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-amber-200 bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    liveStats.level === 'Belum Dinilai'
                      ? 'bg-slate-400'
                      : liveStats.level === 'Hijau'
                      ? 'bg-emerald-500'
                      : liveStats.level === 'Merah'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                />
                {liveStats.level}
              </span>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      {/* Dialog Body */}
      <DialogContent sx={{ p: 2.5, bgcolor: '#ffffff' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
            {errorMsg}
          </Alert>
        )}

        {/* Tab Buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, borderBottom: '1px solid #e2e8f0', pb: 1 }}>
          <button
            type="button"
            onClick={() => setActiveTab('driving')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'driving'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Truck size={17} />
            <span>Aspek Driving (D0 – D4)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forklift')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'forklift'
                ? isRefreshment ? 'bg-teal-600 text-white shadow-sm' : 'bg-sky-600 text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Forklift size={17} />
            <span>Aspek Forklift (F0 – F4) {isRefreshment ? '(Refreshment)' : isStandard ? '(Standard)' : ''}</span>
          </button>
        </Box>

        {/* Aspect Score Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentAspectList.map((aspect, idx) => {
            const actualIndex = offsetIndex + idx;
            const currentScore = scores[actualIndex];

            return (
              <Box
                key={aspect.code}
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': {
                    borderColor: '#cbd5e1',
                    boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.06)',
                  },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  {/* Aspect Code & Description */}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      <span
                        className={`inline-flex h-7 w-8 items-center justify-center rounded-lg text-xs font-black tracking-wider ${
                          activeTab === 'driving'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {aspect.code}
                      </span>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {aspect.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.84rem' }}>
                      {aspect.description}
                    </Typography>
                  </Box>

                  {/* Score Selection Buttons */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {scoreOptions.map((opt) => {
                      const isSelected = currentScore === opt.value;

                      return (
                        <Tooltip key={String(opt.value)} title={opt.text} arrow>
                          <button
                            type="button"
                            onClick={() => handleScoreChange(actualIndex, opt.value)}
                            className={`flex h-9 min-w-[38px] items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                              isSelected
                                ? 'scale-105 shadow-sm ring-2 ring-offset-1'
                                : 'hover:bg-slate-100 hover:border-slate-300'
                            }`}
                            style={{
                              backgroundColor: isSelected ? opt.bg : '#ffffff',
                              color: isSelected ? opt.color : '#475569',
                              border: `1px solid ${isSelected ? opt.color : '#e2e8f0'}`,
                              outline: 'none',
                            }}
                          >
                            {opt.label}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Legend reminder */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            bgcolor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
            Skala Penilaian: <strong>0</strong> (Tidak Tahu) • <strong>1</strong> (Dasar) • <strong>2</strong> (Perlu Pengawasan) • <strong>3</strong> (Mandiri) • <strong>4</strong> (Profesional) • <strong>—</strong> (Belum diuji)
          </Typography>
          <Button
            size="small"
            onClick={handleResetToInitial}
            disabled={isSaving}
            startIcon={<RotateCcw size={13} />}
            sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#64748b' }}
          >
            Reset ke Nilai Awal
          </Button>
        </Box>

        {/* Catatan Kemampuan Driver Kontekstual */}
        <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <FileText size={16} className="text-blue-600" />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
              Catatan & Evaluasi Kemampuan Driver
            </Typography>
            <span className="text-xs text-slate-500 font-medium">(Tersedia catatan per program DDT & Forklift)</span>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {/* Catatan Kemampuan Driving */}
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid #e0e7ff',
                bgcolor: activeTab === 'driving' ? '#fcfdff' : '#ffffff',
                boxShadow: activeTab === 'driving' ? '0 2px 8px rgba(99, 102, 241, 0.08)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Truck size={16} className="text-indigo-600" />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                    Catatan Kemampuan Driving (DDT)
                  </Typography>
                </Box>
                {hasDrivingScores && (
                  <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    Aktif
                  </span>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2.5}
                value={drivingNotes}
                onChange={(e) => setDrivingNotes(e.target.value)}
                placeholder="Catatan evaluasi rute, manuver slalom/seri/parkir, atau PTI truk..."
                disabled={isSaving}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    bgcolor: '#ffffff',
                    color: '#1e293b',
                    '&:hover fieldset': {
                      borderColor: '#818cf8',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4f46e5',
                    },
                  },
                }}
              />
            </Box>

            {/* Catatan Kemampuan Forklift */}
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                border: isRefreshment ? '1px solid #99f6e4' : '1px solid #fde68a',
                bgcolor: activeTab === 'forklift' ? (isRefreshment ? '#f0fdfa' : '#fffdf7') : '#ffffff',
                boxShadow: activeTab === 'forklift' ? (isRefreshment ? '0 2px 8px rgba(13, 148, 136, 0.08)' : '0 2px 8px rgba(245, 158, 11, 0.08)') : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Forklift size={16} className={isRefreshment ? 'text-teal-600' : 'text-amber-600'} />
                  <Typography variant="body2" sx={{ fontWeight: 700, color: isRefreshment ? '#134e4a' : '#78350f' }}>
                    Catatan Kemampuan Forklift {isRefreshment ? '(Refreshment)' : isStandard ? '(Standard)' : ''}
                  </Typography>
                </Box>
                {hasForkliftScores && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                      isRefreshment
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    {isRefreshment ? 'Refreshment (Terbaru)' : isStandard ? 'Standard (Terbaru)' : 'Aktif'}
                  </span>
                )}
              </Box>
              <TextField
                fullWidth
                multiline
                rows={2.5}
                value={forkliftNotes}
                onChange={(e) => setForkliftNotes(e.target.value)}
                placeholder={`Catatan evaluasi ${isRefreshment ? 'asesmen refreshment' : 'asesmen standard'}, operasional, loading/unloading, PTI...`}
                disabled={isSaving}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    bgcolor: '#ffffff',
                    color: '#1e293b',
                    '&:hover fieldset': {
                      borderColor: isRefreshment ? '#2dd4bf' : '#fbbf24',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: isRefreshment ? '#0d9488' : '#d97706',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions
        sx={{
          p: 2.5,
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          disabled={isSaving}
          variant="outlined"
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            borderColor: '#cbd5e1',
            color: '#475569',
            fontWeight: 600,
            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
          }}
        >
          Batal
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
          sx={{
            textTransform: 'none',
            borderRadius: '8px',
            bgcolor: tokens.colors.primary,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: tokens.colors.primaryDark },
          }}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
