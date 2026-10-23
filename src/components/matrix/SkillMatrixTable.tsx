'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
} from '@mui/material';
import { Pencil, CheckCircle2, X, HelpCircle, FileText, Printer, FileSpreadsheet, ArrowUpDown, Filter } from 'lucide-react';
import { tokens } from '@/lib/themeTokens';
import { exportToCSV } from '@/lib/export';
import { formatPersonName, cleanTrainerNotes } from '@/lib/utils';
import type { MatrixDriver } from '@/types/matrix';
import EditMatrixModal from './EditMatrixModal';
import MatrixGuideModal from './MatrixGuideModal';

export type { MatrixDriver };

const fallbackDrivers: MatrixDriver[] = [
  { id: 'DRV-001', name: 'Agung Kharisma Jaya', level: 'Kuning', training: 'Standard', score: 88, aspectScores: [null, null, null, null, null, 3, 3, 3, 3, 4], forkliftNotes: 'Pemahaman SOP forklift baik, perlu evaluasi berkala pada PTI.', notes: 'Pemahaman SOP forklift baik, perlu evaluasi berkala pada PTI.' },
  { id: 'DRV-002', name: 'Rahmat Saleh', level: 'Kuning', training: 'Refreshment', score: 72, aspectScores: [null, null, null, null, null, 2, 2, 2, 2, 3], forkliftNotes: 'Mampu bekerja aman, perlu pemantauan berkala.', notes: 'Mampu bekerja aman, perlu pemantauan berkala.' },
  { id: 'DRV-003', name: 'Riska Andika Putra', level: 'Hijau', training: 'DDT', score: 96, aspectScores: [4, 4, 4, 4, 4, null, null, null, null, null], drivingNotes: 'Sangat kompeten dalam berkendara defensif dan pengecekan PTI.', notes: 'Sangat kompeten dalam berkendara defensif dan pengecekan PTI.' },
  { id: 'DRV-004', name: 'Budi Santoso', level: 'Hijau', training: 'DDT + Forklift', score: 92, aspectScores: [4, 3, 4, 4, 3, 3, 4, 3, 4, 3], drivingNotes: 'Manuver rute dan PTI truk sangat baik.', forkliftNotes: 'Operasional dan loading forklift presisi dan aman.', notes: 'Manuver rute dan PTI truk sangat baik. • Operasional dan loading forklift presisi dan aman.' },
];

const drivingAspects = [
  { code: 'D0', description: 'Menganalisis dan melaporkan kondisi bahaya.' },
  { code: 'D1', description: 'Mengoperasikan truk dengan benar dan aman.' },
  { code: 'D2', description: 'Menangani kondisi abnormal sesuai pekerjaannya.' },
  { code: 'D3', description: 'Melakukan pengiriman di berbagai rute dan pengisian dokumen.' },
  { code: 'D4', description: 'Melakukan pengecekan kendaraan (PTI).' },
];

const forkliftAspects = [
  { code: 'F0', description: 'Menganalisis dan melaporkan kondisi bahaya.' },
  { code: 'F1', description: 'Mengoperasikan forklift dengan benar dan aman.' },
  { code: 'F2', description: 'Memahami dasar pemeliharaan dan pengoperasian forklift.' },
  { code: 'F3', description: 'Memahami dan menjalankan aturan serta SOP yang berlaku.' },
  { code: 'F4', description: 'Melakukan pengecekan kendaraan (PTI).' },
];

const borderedCellSx = {
  borderBottom: '1px solid #f1f5f9',
  borderRight: 0,
  color: tokens.colors.text.primary,
  py: 1.25,
};

const headerCellSx = {
  ...borderedCellSx,
  bgcolor: '#f8fafc',
  fontWeight: 700,
  color: '#475569',
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
};

export default function SkillMatrixTable({ drivers: inputDrivers = fallbackDrivers }: { drivers?: MatrixDriver[] }) {
  const router = useRouter();

  // Kelola state daftar driver lokal agar update tersinkron seketika tanpa hard refresh
  const [driverList, setDriverList] = useState<MatrixDriver[]>(
    inputDrivers.length ? inputDrivers : fallbackDrivers
  );

  // Fungsi sinkronisasi authoritative data dari API
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/matrix', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.drivers && Array.isArray(data.drivers) && data.drivers.length > 0) {
          setDriverList(data.drivers);
          return data.drivers;
        }
      }
    } catch (err) {
      console.warn('[SkillMatrixTable] fetchDrivers warning:', err);
    }
  }, []);

  // Sinkronisasi dengan API Matrix saat komponen pertama kali mount
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Sinkronisasi saat inputDrivers dari SSR berubah, dengan proteksi agar tidak menimpa manual override lokal
  useEffect(() => {
    if (inputDrivers && inputDrivers.length > 0) {
      setDriverList((prevList) => {
        return inputDrivers.map((incoming) => {
          const existing = prevList.find(
            (p) =>
              (Boolean(p.id) && Boolean(incoming.id) && p.id === incoming.id) ||
              p.name.trim().toLowerCase() === incoming.name.trim().toLowerCase()
          );

          // Jika incoming memiliki aspectScores lengkap, utamakan incoming
          if (incoming.aspectScores && incoming.aspectScores.length === 10) {
            return incoming;
          }

          // Jika incoming belum lengkap tapi existing lokal sudah memiliki nilai override, pertahankan existing
          if (existing && existing.aspectScores && existing.aspectScores.length === 10) {
            return {
              ...incoming,
              aspectScores: existing.aspectScores,
              level: existing.level,
              notes: existing.notes || incoming.notes,
              drivingNotes: existing.drivingNotes || incoming.drivingNotes,
              forkliftNotes: existing.forkliftNotes || incoming.forkliftNotes,
            };
          }

          return incoming;
        });
      });
    }
  }, [inputDrivers]);

  // State Modal Edit Matrix, Guide Modal & Toast
  const [selectedDriver, setSelectedDriver] = useState<MatrixDriver | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState<string>('');

  useEffect(() => {
    setTodayStr(
      new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  // Auto-dismiss toast setelah 4.5 detik
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const drivers = driverList;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState<'hybrid' | 'driving' | 'forklift'>('hybrid');
  const [query, setQuery] = useState('');

  // Menghitung atau mengambil 10 aspek skor driver
  const getAspectScores = useCallback((driver: MatrixDriver): (number | null)[] => {
    if (driver.aspectScores && driver.aspectScores.length === 10) {
      return driver.aspectScores;
    }
    if (driver.level === 'Belum Dinilai') {
      return [null, null, null, null, null, null, null, null, null, null];
    }
    const isDdt = (driver.training || '').toUpperCase().includes('DDT');
    const isForklift =
      (driver.training || '').toUpperCase().includes('STAND') ||
      (driver.training || '').toUpperCase().includes('REFRESH') ||
      (driver.training || '').toUpperCase().includes('FORKLIFT');
    const base = driver.level === 'Hijau' ? 4 : driver.level === 'Kuning' ? 3 : driver.level === 'Merah' ? 1 : null;
    if (base === null) {
      return [null, null, null, null, null, null, null, null, null, null];
    }
    return [
      isDdt ? base : null,
      isDdt ? base : null,
      isDdt ? Math.max(0, base - 1) : null,
      isDdt ? base : null,
      isDdt ? base : null,
      isForklift ? base : null,
      isForklift ? base : null,
      isForklift ? Math.max(0, base - 1) : null,
      isForklift ? base : null,
      isForklift ? base : null,
    ];
  }, []);

  const [levelFilter, setLevelFilter] = useState<'all' | 'Hijau' | 'Kuning' | 'Merah' | 'Belum Dinilai'>('all');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'score-desc' | 'score-asc'>('name-asc');

  // Filter data driver berdasarkan kueri pencarian, tab aktif, filter level, dan sorting skor aman
  const filteredDrivers = useMemo(() => {
    const list = drivers.filter((driver) => {
      // 1. Saring berdasarkan pencarian nama driver
      const matchesQuery = driver.name.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;

      // Ambil 10 aspek skor driver
      const scores = getAspectScores(driver);

      // 2. Saring berdasarkan ketersediaan aspek pada tab aktif:
      if (view === 'driving') {
        // Fokus Driving: Wajib memiliki minimal satu nilai valid pada D0 - D4
        const drivingScores = scores.slice(0, 5);
        if (!drivingScores.some((s) => s !== null && s !== undefined)) return false;
      }

      if (view === 'forklift') {
        // Fokus Forklift: Wajib memiliki minimal satu nilai valid pada F0 - F4
        const forkliftScores = scores.slice(5, 10);
        if (!forkliftScores.some((s) => s !== null && s !== undefined)) return false;
      }

      // 3. Saring berdasarkan filter level kompetensi
      if (levelFilter !== 'all') {
        const computedLevel = (() => {
          if (driver.level === 'Belum Dinilai') return 'Belum Dinilai';
          const allValid = scores.filter((v): v is number => v !== null && v !== undefined);
          if (allValid.length === 0) return driver.level || 'Belum Dinilai';
          const numAvg = allValid.reduce((sum, v) => sum + v, 0) / allValid.length;
          if (numAvg >= 3.0) return 'Hijau';
          if (numAvg >= 2.0) return 'Kuning';
          return 'Merah';
        })();
        if (computedLevel !== levelFilter) return false;
      }

      // Hybrid Overview: Tampilkan seluruh driver
      return true;
    });

    // 4. Sorting data: Driver berstatus 'Belum Dinilai' tetap aman dan tidak merusak urutan skor
    return list.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'id');
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'id');
      }

      const getAvg = (driver: MatrixDriver): number | null => {
        if (driver.level === 'Belum Dinilai') return null;
        const scores = getAspectScores(driver);
        const validScores = scores.filter((v): v is number => v !== null && v !== undefined);
        if (validScores.length === 0) return null;
        return validScores.reduce((sum, v) => sum + v, 0) / validScores.length;
      };

      const avgA = getAvg(a);
      const avgB = getAvg(b);

      if (sortBy === 'score-desc') {
        // Skor tertinggi di atas, unrated selalu di posisi terbawah
        if (avgA === null && avgB === null) return a.name.localeCompare(b.name, 'id');
        if (avgA === null) return 1;
        if (avgB === null) return -1;
        if (avgB !== avgA) return avgB - avgA;
        return a.name.localeCompare(b.name, 'id');
      }

      if (sortBy === 'score-asc') {
        // Skor terendah di atas, unrated tetap di posisi paling bawah
        if (avgA === null && avgB === null) return a.name.localeCompare(b.name, 'id');
        if (avgA === null) return 1;
        if (avgB === null) return -1;
        if (avgA !== avgB) return avgA - avgB;
        return a.name.localeCompare(b.name, 'id');
      }

      return 0;
    });
  }, [drivers, query, view, levelFilter, sortBy, getAspectScores]);

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / pageSize));
  const paginatedDrivers = filteredDrivers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [query, view, pageSize, drivers, levelFilter, sortBy]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);
  const visibleDriving = view !== 'forklift';
  const visibleForklift = view !== 'driving';

  const scoreClass = (score: number) =>
    score === 4
      ? 'bg-emerald-700 text-white'
      : score === 3
      ? 'bg-[#5cb85c] text-white'
      : score === 2
      ? 'bg-[#f0ad4e] text-white'
      : score === 1
      ? 'bg-[#337ab7] text-white'
      : 'bg-[#d9534f] text-white';

  // Helper: Mendapatkan catatan yang relevan sesuai konteks tab aktif (bersih tanpa tag metadata sistem)
  const getDriverNotesForView = useCallback(
    (driver: MatrixDriver, currentView: 'hybrid' | 'driving' | 'forklift'): string => {
      const cleanDriving = cleanTrainerNotes(driver.drivingNotes);
      const cleanForklift = cleanTrainerNotes(driver.forkliftNotes);

      if (currentView === 'driving') {
        if (cleanDriving) return cleanDriving;
        if (driver.notes) {
          const match = driver.notes.match(/\[(?:Driving|DDT)\]\s*([^•\n]+)/i);
          if (match) return cleanTrainerNotes(match[1]);
          return cleanTrainerNotes(driver.notes);
        }
        return '';
      }

      if (currentView === 'forklift') {
        if (cleanForklift) return cleanForklift;
        if (driver.notes) {
          const match = driver.notes.match(/\[(?:Forklift|Forklift Refreshment|Forklift Standard)\]\s*([^•\n]+)/i);
          if (match) return cleanTrainerNotes(match[1]);
          return cleanTrainerNotes(driver.notes);
        }
        return '';
      }

      // Hybrid Overview: Gabungkan kedua catatan secara komprehensif tanpa tag [...] sistem
      if (cleanDriving && cleanForklift) {
        return `${cleanDriving} • ${cleanForklift}`;
      }
      if (cleanDriving) return cleanDriving;
      if (cleanForklift) return cleanForklift;
      return cleanTrainerNotes(driver.notes);
    },
    []
  );

  // Export data matriks driver terfilter ke file CSV / Excel
  const handleExportCSV = useCallback(() => {
    const rows = filteredDrivers.map((driver, index) => {
      const scores = getAspectScores(driver);
      const validScores = scores.filter((v): v is number => v !== null && v !== undefined);
      const avg =
        validScores.length > 0
          ? (validScores.reduce((sum, v) => sum + v, 0) / validScores.length).toFixed(1)
          : '—';
      const compLevel =
        driver.level === 'Belum Dinilai' || validScores.length === 0 ? 'Belum Dinilai' : driver.level;
      const note = getDriverNotesForView(driver, view);

      return {
        No: index + 1,
        'Nama Driver': formatPersonName(driver.name),
        'Program Training': driver.training || 'Assessment',
        Level: compLevel,
        'Nilai Skill (AVG)': avg,
        D0: scores[0] !== null && scores[0] !== undefined ? scores[0] : '—',
        D1: scores[1] !== null && scores[1] !== undefined ? scores[1] : '—',
        D2: scores[2] !== null && scores[2] !== undefined ? scores[2] : '—',
        D3: scores[3] !== null && scores[3] !== undefined ? scores[3] : '—',
        D4: scores[4] !== null && scores[4] !== undefined ? scores[4] : '—',
        F0: scores[5] !== null && scores[5] !== undefined ? scores[5] : '—',
        F1: scores[6] !== null && scores[6] !== undefined ? scores[6] : '—',
        F2: scores[7] !== null && scores[7] !== undefined ? scores[7] : '—',
        F3: scores[8] !== null && scores[8] !== undefined ? scores[8] : '—',
        F4: scores[9] !== null && scores[9] !== undefined ? scores[9] : '—',
        'Catatan Evaluasi': note || '-',
      };
    });

    const headers = [
      'No',
      'Nama Driver',
      'Program Training',
      'Level',
      'Nilai Skill (AVG)',
      'D0',
      'D1',
      'D2',
      'D3',
      'D4',
      'F0',
      'F1',
      'F2',
      'F3',
      'F4',
      'Catatan Evaluasi',
    ];

    exportToCSV(`slec-skill-matrix-${new Date().toISOString().slice(0, 10)}.csv`, rows, headers);
  }, [filteredDrivers, getAspectScores, getDriverNotesForView, view]);

  const handleOpenEdit = (driver: MatrixDriver) => {
    // Pastikan aspectScores selalu terisi lengkap sebelum dikirim ke modal
    const currentScores = getAspectScores(driver);
    setSelectedDriver({
      ...driver,
      aspectScores: currentScores,
    });
    setIsModalOpen(true);
  };

  const handleSaveSuccess = async (updatedDriver: MatrixDriver) => {
    // 1. Optimistic & Instant Local State Update (Zero Latency UI update)
    setDriverList((prevList) =>
      prevList.map((d) => {
        const isMatch =
          (Boolean(d.id) && Boolean(updatedDriver.id) && d.id === updatedDriver.id) ||
          d.name.trim().toLowerCase() === updatedDriver.name.trim().toLowerCase();
        return isMatch
          ? {
              ...d,
              ...updatedDriver,
              aspectScores: updatedDriver.aspectScores ? [...updatedDriver.aspectScores] : d.aspectScores,
              level: updatedDriver.level,
              notes: updatedDriver.notes,
              drivingNotes: updatedDriver.drivingNotes,
              forkliftNotes: updatedDriver.forkliftNotes,
            }
          : d;
      })
    );

    // 2. Tampilkan notifikasi toast sukses
    setToastMessage(`Nilai matriks untuk "${updatedDriver.name}" berhasil diperbarui.`);

    // 3. Re-fetch data matrix otoritatif dari server via API
    try {
      await fetchDrivers();
    } catch (err) {
      console.warn('[SkillMatrixTable] Re-fetch error:', err);
    }

    // 4. Sinkronisasi Next.js Server Components / router cache
    try {
      router.refresh();
    } catch (_) {}
  };

  return (
    <>
      {/* Toast Notification Sukses */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-xl shadow-emerald-950/10 transition-all duration-300 print:hidden">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div className="flex-1 text-sm font-medium text-slate-800">
            {toastMessage}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* DOKUMEN CETAK RESMI A4 LANDSCAPE (KHUSUS PRINT)                */}
      {/* ============================================================== */}
      <div className="hidden print:block w-full text-slate-900 bg-white">
        {/* KOP DOKUMEN RESMI SLEC */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3">
          <div className="flex items-center justify-between">
            {/* Kiri: Logo SLEC & Judul Resmi */}
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-slec.png"
                alt="Logo SLEC"
                className="h-14 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo-slec.jpeg')) {
                    target.src = '/logo-slec.jpeg';
                  }
                }}
              />
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase leading-snug">
                  MATRIKS KOMPETENSI &amp; SKILL DRIVER (SKILL MATRIX)
                </h1>
                <p className="text-xs font-extrabold text-indigo-950 tracking-wider">
                  SYNCRUM LOGISTICS EDUCATION CENTER (SLEC)
                </p>
                <p className="text-[9.5px] text-slate-500 font-medium">
                  Standard Competency &amp; Operational Evaluation • PT Syncrum Logistics
                </p>
              </div>
            </div>

            {/* Kanan: Metadata Dokumen Cetak */}
            <div className="text-right text-[9.5px] space-y-0.5 text-slate-700 border-l border-slate-200 pl-4 min-w-[200px]">
              <p>
                <span className="text-slate-500">Tanggal Cetak: </span>
                <span className="font-bold text-slate-900" suppressHydrationWarning>{todayStr || '22 Oktober 2026'}</span>
              </p>
              <p>
                <span className="text-slate-500">Total Driver: </span>
                <span className="font-bold text-slate-900">{filteredDrivers.length} Orang</span>
              </p>
              <p>
                <span className="text-slate-500">Fokus Program: </span>
                <span className="font-semibold text-slate-800">
                  {view === 'hybrid' ? 'Hybrid (Driving & Forklift)' : view === 'driving' ? 'Fokus Driving' : 'Fokus Forklift'}
                </span>
              </p>
              {levelFilter !== 'all' && (
                <p>
                  <span className="text-slate-500">Filter Level: </span>
                  <span className="font-semibold text-slate-800">{levelFilter}</span>
                </p>
              )}
              {query && (
                <p>
                  <span className="text-slate-500">Pencarian: </span>
                  <span className="font-semibold text-slate-800">&quot;{query}&quot;</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* TABEL CETAK PADAT & LENGKAP A4 LANDSCAPE (SEMUA FILTERED DRIVERS) */}
        <table className="w-full border-collapse border border-slate-300 text-[9.5px] leading-tight">
          <thead>
            <tr className="bg-slate-100 text-slate-900">
              <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center font-bold w-7">
                No.
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-left font-bold w-44">
                Nama Lengkap Driver
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center font-bold w-16">
                Level
              </th>
              {visibleDriving && (
                <th colSpan={5} className="border border-slate-300 px-1 py-0.5 text-center font-bold bg-indigo-50/80 text-indigo-950 uppercase tracking-wider text-[9px]">
                  DRIVING (DDT)
                </th>
              )}
              {visibleForklift && (
                <th colSpan={5} className="border border-slate-300 px-1 py-0.5 text-center font-bold bg-sky-50/80 text-sky-950 uppercase tracking-wider text-[9px]">
                  FORKLIFT
                </th>
              )}
              <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center font-bold w-12">
                AVG*
              </th>
              <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-left font-bold">
                Catatan Evaluasi
              </th>
            </tr>
            <tr className="bg-slate-50 text-slate-700 text-[9px]">
              {visibleDriving && drivingAspects.map((aspect) => (
                <th key={`print-${aspect.code}`} className="border border-slate-300 px-0.5 py-0.5 text-center font-bold w-7 bg-indigo-50/40">
                  {aspect.code}
                </th>
              ))}
              {visibleForklift && forkliftAspects.map((aspect) => (
                <th key={`print-${aspect.code}`} className="border border-slate-300 px-0.5 py-0.5 text-center font-bold w-7 bg-sky-50/40">
                  {aspect.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td
                  colSpan={(visibleDriving ? 5 : 0) + (visibleForklift ? 5 : 0) + 5}
                  className="border border-slate-300 py-6 text-center text-slate-500 font-medium"
                >
                  Tidak ada data driver yang sesuai dengan kriteria filter cetak.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver, index) => {
                const scores = getAspectScores(driver);
                const hasDrivingScores = scores.slice(0, 5).some((s) => s !== null && s !== undefined);
                const hasForkliftScores = scores.slice(5, 10).some((s) => s !== null && s !== undefined);
                const trainStr = (driver.training || '').toUpperCase();
                const isRefreshment = trainStr.includes('REFRESH');
                const isStandard = trainStr.includes('STAND');
                const forkliftSubLabel = isRefreshment ? 'Refreshment' : isStandard ? 'Standard' : 'Forklift';

                const isHybridProgram =
                  (hasDrivingScores && hasForkliftScores) ||
                  (trainStr.includes('DDT') && (trainStr.includes('FORKLIFT') || trainStr.includes('STAND') || trainStr.includes('REFRESH')));

                const programLabel = isHybridProgram
                  ? `DDT + Forklift (${forkliftSubLabel})`
                  : hasForkliftScores
                  ? `Forklift (${forkliftSubLabel})`
                  : hasDrivingScores
                  ? 'DDT (Driving)'
                  : driver.training || 'Assessment';

                const visibleScores = [
                  ...(visibleDriving ? scores.slice(0, 5) : []),
                  ...(visibleForklift ? scores.slice(5, 10) : []),
                ];
                const validScores = visibleScores.filter((v): v is number => v !== null && v !== undefined);
                const avg =
                  validScores.length > 0
                    ? (validScores.reduce((sum, value) => sum + value, 0) / validScores.length).toFixed(1)
                    : '—';

                const computedLevel: 'Hijau' | 'Kuning' | 'Merah' | 'Belum Dinilai' = (() => {
                  if (driver.level === 'Belum Dinilai') return 'Belum Dinilai';
                  const allValid = scores.filter((v): v is number => v !== null && v !== undefined);
                  if (allValid.length === 0) return (driver.level as any) || 'Belum Dinilai';
                  const numAvg = allValid.reduce((sum, v) => sum + v, 0) / allValid.length;
                  if (numAvg >= 3.0) return 'Hijau';
                  if (numAvg >= 2.0) return 'Kuning';
                  return 'Merah';
                })();

                const contextualNote = getDriverNotesForView(driver, view);
                const cleanNote = cleanTrainerNotes(contextualNote);

                return (
                  <tr
                    key={`print-row-${driver.id || driver.name}-${index}`}
                    className={index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}
                  >
                    <td className="border border-slate-300 px-1 py-1 text-center font-medium text-slate-700">
                      {index + 1}
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      <div className="font-bold text-slate-900 leading-tight">
                        {formatPersonName(driver.name)}
                      </div>
                      <div className="text-[8px] text-slate-500 font-medium">
                        {programLabel}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-1 py-1 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded font-bold text-[8.5px] ${
                          computedLevel === 'Hijau'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : computedLevel === 'Kuning'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : computedLevel === 'Merah'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {computedLevel}
                      </span>
                    </td>
                    {visibleDriving &&
                      drivingAspects.map((aspect, aspectIndex) => {
                        const val = scores[aspectIndex];
                        return (
                          <td
                            key={`print-d-${driver.name}-${aspect.code}`}
                            className="border border-slate-300 px-0.5 py-1 text-center"
                          >
                            {val === null || val === undefined ? (
                              <span className="text-slate-400 font-normal">—</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8.5px] font-bold ${
                                  val === 4
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : val === 3
                                    ? 'bg-lime-100 text-lime-900 border border-lime-300'
                                    : val === 2
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : val === 1
                                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    {visibleForklift &&
                      forkliftAspects.map((aspect, aspectIndex) => {
                        const val = scores[aspectIndex + drivingAspects.length];
                        return (
                          <td
                            key={`print-f-${driver.name}-${aspect.code}`}
                            className="border border-slate-300 px-0.5 py-1 text-center"
                          >
                            {val === null || val === undefined ? (
                              <span className="text-slate-400 font-normal">—</span>
                            ) : (
                              <span
                                className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8.5px] font-bold ${
                                  val === 4
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : val === 3
                                    ? 'bg-lime-100 text-lime-900 border border-lime-300'
                                    : val === 2
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : val === 1
                                    ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    <td className="border border-slate-300 px-1 py-1 text-center font-black text-slate-900 text-[10px]">
                      {avg}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-slate-700 text-[8.5px] leading-tight">
                      {cleanNote || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* FOOTER LEGENDA & BLOK TANDA TANGAN (page-break-inside-avoid) */}
        <div className="mt-3 pt-2.5 border-t border-slate-300 page-break-inside-avoid">
          <div className="flex justify-between items-start gap-4">
            {/* Kiri: Legenda Aspek & Skala Nilai */}
            <div className="flex-1 space-y-1.5 text-[8.5px] text-slate-700 leading-normal">
              <div>
                <span className="font-bold text-slate-900 uppercase text-[9px] mr-1">
                  Keterangan Aspek Penilaian:
                </span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-0.5">
                  <div className="bg-slate-50 p-1 rounded border border-slate-200">
                    <span className="font-bold text-indigo-950 block text-[8.5px]">Aspek Driving (D0 – D4):</span>
                    <span className="text-slate-600">
                      <strong>D0:</strong> Analisis Bahaya • <strong>D1:</strong> Operasional Truk • <strong>D2:</strong> Kondisi Abnormal • <strong>D3:</strong> Rute &amp; Dokumen • <strong>D4:</strong> PTI Truk
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1 rounded border border-slate-200">
                    <span className="font-bold text-sky-950 block text-[8.5px]">Aspek Forklift (F0 – F4):</span>
                    <span className="text-slate-600">
                      <strong>F0:</strong> Analisis Bahaya • <strong>F1:</strong> Operasional Forklift • <strong>F2:</strong> Dasar Pemeliharaan • <strong>F3:</strong> Aturan &amp; SOP • <strong>F4:</strong> PTI Forklift
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-0.5">
                <span className="font-bold text-slate-900 uppercase text-[9px] mr-1">Skala Nilai:</span>
                <span className="text-slate-600">
                  <strong className="text-red-700">0</strong>: Unskilled (&lt;50%) |{' '}
                  <strong className="text-sky-700">1</strong>: Basic (50-69%) |{' '}
                  <strong className="text-amber-700">2</strong>: Intermediate (70-79%) |{' '}
                  <strong className="text-lime-700">3</strong>: Advanced (80-89%) |{' '}
                  <strong className="text-emerald-700">4</strong>: Expert (90-100%) |{' '}
                  <strong>—</strong>: Belum Dinilai
                </span>
              </div>
            </div>

            {/* Kanan: Blok Tanda Tangan */}
            <div className="w-80 flex justify-between gap-4 text-center text-[9.5px]">
              <div className="flex-1 flex flex-col justify-between h-24 border border-slate-300 rounded p-1.5 bg-slate-50/50">
                <p className="font-semibold text-slate-700">Dicetak Oleh,</p>
                <div className="border-b border-slate-400 mx-2"></div>
                <div>
                  <p className="font-bold text-slate-900">Trainer SLEC</p>
                  <p className="text-[8px] text-slate-500">Tanggal: {todayStr || '.....................'}</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between h-24 border border-slate-300 rounded p-1.5 bg-slate-50/50">
                <p className="font-semibold text-slate-700">Mengetahui,</p>
                <div className="border-b border-slate-400 mx-2"></div>
                <div>
                  <p className="font-bold text-slate-900">Management CCR</p>
                  <p className="text-[8px] text-slate-500">Tanggal: .....................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Paper
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm print:hidden"
        sx={{
          p: { xs: 2, md: 3 },
          bgcolor: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(15, 23, 42, .05)',
          minHeight: '680px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Area */}
        <Box className="print:hidden" sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h1" sx={{ fontWeight: 900, color: tokens.colors.text.primary, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Matriks Skill Driver
            </Typography>
            <Typography component="span" className="mt-2 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-800">
              SYNCRUM LOGISTICS EDUCATION CENTER (SLEC)
            </Typography>
          </Box>
          <Box className="print:hidden" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography className="rounded-full border border-slate-200/60 bg-slate-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-700">
              {filteredDrivers.length} {view === 'driving' ? 'Driver Driving' : view === 'forklift' ? 'Driver Forklift' : 'Driver'} • 10 Aspek Penilaian
            </Typography>

            {/* Tombol Panduan Aspek & Skala */}
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 active:scale-95 print:hidden"
            >
              <HelpCircle size={16} className="text-blue-600" />
              <span>Panduan Aspek & Skala</span>
            </button>

            {/* Tombol Export Excel / CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-700 active:scale-95 print:hidden"
              title="Export data matriks sesuai filter & sorting aktif"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <span>Export CSV/Excel</span>
            </button>

            {/* Tombol Cetak Laporan PDF */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 active:scale-95 print:hidden"
              title="Cetak atau simpan laporan matriks sebagai PDF"
            >
              <Printer size={16} className="text-blue-600" />
              <span>Cetak PDF</span>
            </button>
          </Box>
        </Box>

        {/* View Focus Tabs & Filter / Sorting Controls */}
        <Box className="print:hidden" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
          {/* Tabs Fokus Penilaian */}
          <Box className="print:hidden" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {[
              ['hybrid', 'Hybrid Overview'],
              ['driving', 'Fokus Driving'],
              ['forklift', 'Fokus Forklift'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value as typeof view)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  view === value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </Box>

          {/* Filter Level, Sorting Skor & Search Input */}
          <Box className="print:hidden" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter Level Kompetensi */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select
                aria-label="Filter Level Kompetensi"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Semua Level</option>
                <option value="Hijau">Level Hijau</option>
                <option value="Kuning">Level Kuning</option>
                <option value="Merah">Level Merah</option>
                <option value="Belum Dinilai">Belum Dinilai</option>
              </select>
            </div>

            {/* Sorting Berdasarkan Nama / Skor AVG */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
              <ArrowUpDown size={14} className="text-slate-400" />
              <select
                aria-label="Urutkan Data Matriks"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="name-asc">Nama (A-Z)</option>
                <option value="name-desc">Nama (Z-A)</option>
                <option value="score-desc">Skor AVG Tertinggi</option>
                <option value="score-asc">Skor AVG Terendah</option>
              </select>
            </div>

            {/* Input Pencarian Driver */}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama driver..."
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm min-w-[170px]"
            />
          </Box>
        </Box>

        {/* Tabel Kontainer dengan min-height konsisten agar layout tidak collapse saat filtering */}
        <TableContainer
          className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm print:overflow-visible print:w-full print:shadow-none print:border-none"
          sx={{
            overflowX: 'auto',
            minHeight: '480px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Table size="small" sx={{ minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0 }}>
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} align="center" sx={{ ...headerCellSx, width: 48 }}>
                  No.
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...headerCellSx, minWidth: 220 }}>
                  Nama lengkap driver
                </TableCell>
                <TableCell rowSpan={2} align="center" sx={{ ...headerCellSx, minWidth: 90 }}>
                  Level
                </TableCell>
                {visibleDriving && (
                  <TableCell colSpan={5} align="center" sx={{ ...borderedCellSx, bgcolor: '#eef2ff', color: '#312e81', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #e0e7ff', py: 1.25 }}>
                    DRIVING
                  </TableCell>
                )}
                {visibleForklift && (
                  <TableCell colSpan={5} align="center" sx={{ ...borderedCellSx, bgcolor: '#f0f9ff', color: '#0369a1', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #bae6fd', py: 1.25 }}>
                    FORKLIFT
                  </TableCell>
                )}
                <TableCell rowSpan={2} align="center" sx={{ ...headerCellSx, minWidth: 96 }}>
                  Nilai skill
                  <br />
                  (AVG)*
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...headerCellSx, minWidth: 200, maxWidth: 280 }}>
                  Catatan Evaluasi
                </TableCell>
                <TableCell rowSpan={2} align="center" className="print:hidden" sx={{ ...headerCellSx, minWidth: 70, width: 70 }}>
                  Aksi
                </TableCell>
              </TableRow>
              <TableRow>
                {visibleDriving && drivingAspects.map((aspect) => (
                  <TableCell key={aspect.code} title={aspect.description} align="center" sx={{ ...headerCellSx, color: '#64748b', width: 68, bgcolor: 'rgba(248, 250, 252, .5)', borderBottom: '1px solid rgba(226, 232, 240, .6)', py: 1 }}>
                    {aspect.code}
                  </TableCell>
                ))}
                {visibleForklift && forkliftAspects.map((aspect) => (
                  <TableCell key={aspect.code} title={aspect.description} align="center" sx={{ ...headerCellSx, color: '#64748b', width: 68, bgcolor: '#f8fafc' }}>
                    {aspect.code}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDrivers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(visibleDriving ? 5 : 0) + (visibleForklift ? 5 : 0) + 6}
                    align="center"
                    sx={{ py: 8, color: '#64748b' }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#475569' }}>
                      Tidak ada driver {view === 'driving' ? 'dengan riwayat aspek Driving' : view === 'forklift' ? 'dengan riwayat aspek Forklift' : ''} {query ? `yang sesuai dengan pencarian "${query}"` : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      Silakan pilih tab filter lain atau coba kata kunci pencarian yang berbeda.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDrivers.map((driver, index) => {
                  const scores = getAspectScores(driver);
                  const hasDrivingScores = scores.slice(0, 5).some((s) => s !== null && s !== undefined);
                  const hasForkliftScores = scores.slice(5, 10).some((s) => s !== null && s !== undefined);
                  const trainStr = (driver.training || '').toUpperCase();
                  const isRefreshment = trainStr.includes('REFRESH');
                  const isStandard = trainStr.includes('STAND');
                  const forkliftSubLabel = isRefreshment ? 'Refreshment' : isStandard ? 'Standard' : 'Forklift';

                  const isHybridProgram =
                    (hasDrivingScores && hasForkliftScores) ||
                    (trainStr.includes('DDT') && (trainStr.includes('FORKLIFT') || trainStr.includes('STAND') || trainStr.includes('REFRESH')));

                  const visibleScores = [
                    ...(visibleDriving ? scores.slice(0, 5) : []),
                    ...(visibleForklift ? scores.slice(5, 10) : []),
                  ];
                  const validScores = visibleScores.filter((v): v is number => v !== null && v !== undefined);
                  const avg =
                    validScores.length > 0
                      ? (validScores.reduce((sum, value) => sum + value, 0) / validScores.length).toFixed(1)
                      : '—';

                  const computedLevel: 'Hijau' | 'Kuning' | 'Merah' | 'Belum Dinilai' = (() => {
                    if (driver.level === 'Belum Dinilai') return 'Belum Dinilai';
                    const allValid = scores.filter((v): v is number => v !== null && v !== undefined);
                    if (allValid.length === 0) return (driver.level as any) || 'Belum Dinilai';
                    const numAvg = allValid.reduce((sum, v) => sum + v, 0) / allValid.length;
                    if (numAvg >= 3.0) return 'Hijau';
                    if (numAvg >= 2.0) return 'Kuning';
                    return 'Merah';
                  })();

                  const renderAspectCell = (value: number | null | undefined, key: string, title?: string) => (
                    <TableCell key={key} title={title} align="center" sx={borderedCellSx}>
                      {value === null || value === undefined ? (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            color: '#94a3b8',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          —
                        </Box>
                      ) : (
                        <Box
                          component="span"
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold shadow-sm transition hover:scale-105 ${scoreClass(
                            value
                          )}`}
                        >
                          {value}
                        </Box>
                      )}
                    </TableCell>
                  );

                  const contextualNote = getDriverNotesForView(driver, view);
                  const cleanDriving = cleanTrainerNotes(driver.drivingNotes);
                  const cleanForklift = cleanTrainerNotes(driver.forkliftNotes);
                  const cleanGeneralNotes = cleanTrainerNotes(driver.notes);
                  const hasAnyNotes = Boolean(cleanDriving || cleanForklift || cleanGeneralNotes);

                  return (
                    <TableRow
                      key={`${driver.id || driver.name}-${index}`}
                      className="transition-colors hover:bg-slate-50/70"
                      sx={{ '&:nth-of-type(even)': { bgcolor: '#fcfdff' } }}
                    >
                      <TableCell align="center" sx={borderedCellSx}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell sx={{ ...borderedCellSx, fontWeight: 500 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box>
                            {/* Nama Driver dengan Tooltip Catatan Kemampuan jika tersedia */}
                            <Tooltip
                              title={
                                hasAnyNotes ? (
                                  <Box sx={{ p: 0.75, maxWidth: 300 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', color: '#93c5fd', mb: 0.5 }}>
                                      Catatan Evaluasi Driver:
                                    </Typography>
                                    {cleanDriving && (
                                      <Box sx={{ mb: 0.5 }}>
                                        <span className="font-bold text-indigo-300 text-xs">Driving (DDT): </span>
                                        <span className="text-white text-xs">{cleanDriving}</span>
                                      </Box>
                                    )}
                                    {cleanForklift && (
                                      <Box sx={{ mb: 0.5 }}>
                                        <span className={`font-bold text-xs ${isRefreshment ? 'text-teal-300' : 'text-amber-300'}`}>
                                          Forklift {isRefreshment ? '(Refreshment)' : isStandard ? '(Standard)' : ''}:{' '}
                                        </span>
                                        <span className="text-white text-xs">{cleanForklift}</span>
                                      </Box>
                                    )}
                                    {!cleanDriving && !cleanForklift && cleanGeneralNotes && (
                                      <Typography variant="caption" sx={{ color: '#ffffff', lineHeight: 1.4, display: 'block' }}>
                                        {cleanGeneralNotes}
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  `Driver: ${formatPersonName(driver.name)}`
                                )
                              }
                              arrow
                              placement="top-start"
                            >
                              <Typography
                                variant="body2"
                                className="capitalize"
                                sx={{
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  textTransform: 'capitalize',
                                  cursor: hasAnyNotes ? 'help' : 'default',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                }}
                              >
                                {formatPersonName(driver.name)}
                                {hasAnyNotes && (
                                  <FileText size={13} className="text-blue-500 flex-shrink-0" />
                                )}
                              </Typography>
                            </Tooltip>

                            {/* Label Program / Badge Sub-Program */}
                            {isHybridProgram ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.5, flexWrap: 'wrap' }}>
                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  DDT
                                </span>
                                <span className="text-slate-300 text-xs font-bold">+</span>
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                    isRefreshment
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                  title={`Asesmen Forklift: ${isRefreshment ? 'Refreshment (Asesmen Terbaru)' : isStandard ? 'Standard (Asesmen Terbaru)' : 'Aktif'}`}
                                >
                                  {forkliftSubLabel}
                                </span>
                              </Box>
                            ) : hasForkliftScores ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <span
                                  className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                    isRefreshment
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                  title={`Asesmen Forklift: ${isRefreshment ? 'Refreshment (Asesmen Terbaru)' : 'Standard (Asesmen Terbaru)'}`}
                                >
                                  {isRefreshment
                                    ? 'Forklift (Refreshment)'
                                    : isStandard
                                    ? 'Forklift (Standard)'
                                    : (driver.training || 'Forklift')}
                                </span>
                              </Box>
                            ) : hasDrivingScores ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {driver.training && driver.training.toUpperCase().includes('DDT') ? driver.training : 'DDT (Driving)'}
                                </span>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                {driver.training || 'Assessment'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={borderedCellSx}>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            computedLevel === 'Belum Dinilai'
                              ? 'border border-slate-200 bg-slate-100 text-slate-600'
                              : computedLevel === 'Hijau'
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : computedLevel === 'Merah'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              computedLevel === 'Belum Dinilai'
                                ? 'bg-slate-400'
                                : computedLevel === 'Hijau'
                                ? 'bg-emerald-500'
                                : computedLevel === 'Merah'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {computedLevel}
                        </span>
                      </TableCell>
                      {visibleDriving &&
                        drivingAspects.map((aspect, aspectIndex) =>
                          renderAspectCell(
                            scores[aspectIndex],
                            `${driver.name}-${aspect.code}`,
                            aspect.description
                          )
                        )}
                      {visibleForklift &&
                        forkliftAspects.map((aspect, aspectIndex) =>
                          renderAspectCell(
                            scores[aspectIndex + drivingAspects.length],
                            `${driver.name}-${aspect.code}`,
                            aspect.description
                          )
                        )}
                      <TableCell align="center" sx={{ ...borderedCellSx, fontWeight: 800 }}>
                        <span className={`text-sm text-center ${avg === '—' ? 'text-slate-400 font-medium' : 'font-bold text-slate-800'}`}>{avg}</span>
                      </TableCell>

                      {/* Catatan Evaluasi Kontekstual */}
                      <TableCell sx={{ ...borderedCellSx, minWidth: 200, maxWidth: 280 }}>
                        {contextualNote ? (
                          <Typography
                            variant="body2"
                            title={contextualNote}
                            sx={{
                              color: '#475569',
                              fontSize: '0.8125rem',
                              lineHeight: 1.45,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'help',
                            }}
                          >
                            {contextualNote}
                          </Typography>
                        ) : (
                          <span className="text-slate-400 font-medium text-[0.8125rem]">-</span>
                        )}
                      </TableCell>

                      {/* Tombol Aksi Edit Matrix */}
                      <TableCell align="center" className="print:hidden" sx={borderedCellSx}>
                        <Tooltip title="Edit Matrix & Catatan Driver" arrow>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(driver)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 active:scale-95"
                            aria-label={`Edit Matrix ${formatPersonName(driver.name)}`}
                          >
                            <Pencil size={14} />
                          </button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        <Box className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row print:hidden" sx={{ mt: 'auto' }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Menampilkan <strong className="text-slate-800">{filteredDrivers.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredDrivers.length)}</strong> dari <strong className="text-slate-800">{filteredDrivers.length}</strong> driver
          </Typography>
          <Box className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition ${
                  page === currentPage
                    ? 'bg-blue-600 font-semibold text-white shadow-sm'
                    : 'border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </Box>
        </Box>
      </Paper>

      {/* Modal Dialog Edit Matrix */}
      <EditMatrixModal
        open={isModalOpen}
        driver={selectedDriver}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSaveSuccess}
        onRefresh={fetchDrivers}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Modal Dialog Panduan Aspek & Skala */}
      <MatrixGuideModal
        open={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </>
  );
}
