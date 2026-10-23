'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, FileSpreadsheet, Printer, TrendingUp, Users, Award, AlertTriangle } from 'lucide-react';
import { exportToCSV } from '@/lib/export';
import { formatPersonName } from '@/lib/utils';
import DateRangeFilter, { isWithinDateRangeInclusive } from '@/components/common/DateRangeFilter';

export interface ReportRow {
  id: string;
  driver: string;
  nik: string;
  plateOrUnit?: string;
  docNumber?: string;
  program: string;
  assessmentType?: string;
  drivingAverage: number | null;
  forkliftAverage: number | null;
  score: number;
  level: 'Hijau' | 'Kuning' | 'Merah';
  status: 'PASS' | 'FAIL';
  evaluationDate: string;
}

export function formatCombinedScore(
  driving: number | null | undefined,
  forklift: number | null | undefined
): string {
  const dStr = driving !== null && driving !== undefined ? driving.toFixed(1) : '—';
  const fStr = forklift !== null && forklift !== undefined ? forklift.toFixed(1) : '—';
  return `${dStr} / ${fStr}`;
}

interface ReportsTableProps { data: ReportRow[] }

const levelStyle = {
  Hijau: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Kuning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Merah: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

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

export default function ReportsTable({ data }: ReportsTableProps) {
  const [category, setCategory] = useState('all');
  const [period, setPeriod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [printDate, setPrintDate] = useState('');
  const pageSize = 10;

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  const categoryLabel = useMemo(() => {
    switch (category) {
      case 'driving':
        return 'Khusus Driving (DDT)';
      case 'forklift':
        return 'Khusus Forklift';
      case 'retraining':
        return 'Log Evaluasi Gagal / Retraining';
      default:
        return 'Semua Kategori (Seluruh Driver)';
    }
  }, [category]);

  const periodLabel = useMemo(() => {
    if (startDate || endDate) {
      const sStr = startDate
        ? new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Awal';
      const eStr = endDate
        ? new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Sekarang';
      return `${sStr} s/d ${eStr}`;
    }
    switch (period) {
      case 'month':
        return 'Bulan Ini';
      case 'quarter':
        return '3 Bulan Terakhir';
      case 'year':
        return 'Tahun 2026';
      default:
        return 'Semua Periode';
    }
  }, [period, startDate, endDate]);

  const filtered = useMemo(() => data.filter((row) => {
    let matchesCategory = true;
    if (category === 'driving') {
      matchesCategory = row.drivingAverage !== null;
    } else if (category === 'forklift') {
      matchesCategory = row.forkliftAverage !== null;
    } else if (category === 'retraining') {
      matchesCategory = row.status === 'FAIL' || row.level === 'Merah';
    }

    // Inclusive Date Range Filtering (00:00:00 s/d 23:59:59)
    if (!isWithinDateRangeInclusive(row.evaluationDate, startDate, endDate)) {
      return false;
    }

    // Secondary preset filter applied when custom date range is not filled
    let matchesPeriod = true;
    if (!startDate && !endDate) {
      const date = new Date(row.evaluationDate);
      const now = new Date();
      matchesPeriod = period === 'all' || (period === 'month' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) || (period === 'quarter' && date >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())) || (period === 'year' && date.getFullYear() === now.getFullYear());
    }

    return matchesCategory && matchesPeriod;
  }), [data, category, period, startDate, endDate]);

  const programSummaries = useMemo(() => {
    const categories = [
      {
        key: 'ddt',
        title: 'Truck Assessment DDT',
        subtitle: 'Defensive Driving Training',
        colorBadge: 'bg-blue-50 text-blue-700 border-blue-200',
        matcher: (row: ReportRow) => {
          const type = (row.assessmentType || '').toUpperCase();
          const prog = (row.program || '').toUpperCase();
          return (
            type === 'DDT' ||
            prog.includes('DDT') ||
            prog.includes('TRUCK') ||
            (!prog.includes('FORKLIFT') && row.drivingAverage !== null)
          );
        },
        scoreGetter: (row: ReportRow) => row.drivingAverage ?? row.score,
      },
      {
        key: 'forklift_standard',
        title: 'Forklift - Standard',
        subtitle: 'SOP & Basic Handling Operation',
        colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        matcher: (row: ReportRow) => {
          const type = (row.assessmentType || '').toUpperCase();
          const prog = (row.program || '').toUpperCase();
          return (
            type === 'TMMIN_STANDARD' ||
            type === 'TMMIN' ||
            (prog.includes('STANDARD') && prog.includes('FORKLIFT')) ||
            (prog.includes('FORKLIFT') && !prog.includes('REFRESHMENT'))
          );
        },
        scoreGetter: (row: ReportRow) => row.forkliftAverage ?? row.score,
      },
      {
        key: 'forklift_refreshment',
        title: 'Forklift - Refreshment',
        subtitle: 'Periodic Evaluation & Retraining',
        colorBadge: 'bg-teal-50 text-teal-700 border-teal-200',
        matcher: (row: ReportRow) => {
          const type = (row.assessmentType || '').toUpperCase();
          const prog = (row.program || '').toUpperCase();
          return (
            type === 'TMMIN_REFRESHMENT' ||
            (prog.includes('REFRESHMENT') && prog.includes('FORKLIFT'))
          );
        },
        scoreGetter: (row: ReportRow) => row.forkliftAverage ?? row.score,
      },
    ];

    return categories.map((cat) => {
      const matchedRows = filtered.filter(cat.matcher);
      const total = matchedRows.length;
      const passed = matchedRows.filter((r) => r.status === 'PASS').length;
      const failed = matchedRows.filter((r) => r.status === 'FAIL').length;
      const passRate = total > 0 ? (passed / total) * 100 : 0;
      const avgScore =
        total > 0
          ? matchedRows.reduce((sum, r) => sum + cat.scoreGetter(r), 0) / total
          : 0;

      return {
        ...cat,
        total,
        passed,
        failed,
        passRate,
        avgScore,
      };
    });
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const average = filtered.length ? filtered.reduce((sum, row) => sum + row.score, 0) / filtered.length : 0;
  const passRate = filtered.length ? filtered.filter((row) => row.status === 'PASS').length / filtered.length * 100 : 0;
  const retraining = filtered.filter((row) => row.status === 'FAIL' || row.level === 'Merah').length;

  useEffect(() => {
    setPage(1);
  }, [category, period, startDate, endDate]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const exportRows = () => exportToCSV(
    `slec-laporan-${new Date().toISOString().slice(0, 10)}.csv`,
    filtered.map((row) => ({
      Driver: formatPersonName(row.driver),
      'No. Polisi / No. Body': row.plateOrUnit || row.nik,
      'No. Dokumen': row.docNumber || '—',
      Program: row.program,
      Driving: row.drivingAverage !== null && row.drivingAverage !== undefined ? row.drivingAverage.toFixed(1) : '—',
      Forklift: row.forkliftAverage !== null && row.forkliftAverage !== undefined ? row.forkliftAverage.toFixed(1) : '—',
      'Skor Driving / Forklift': formatCombinedScore(row.drivingAverage, row.forkliftAverage),
      Level: row.level,
      Status: row.status,
      'Tanggal Evaluasi': row.evaluationDate.slice(0, 10),
    })),
    [
      'Driver',
      'No. Polisi / No. Body',
      'No. Dokumen',
      'Program',
      'Driving',
      'Forklift',
      'Skor Driving / Forklift',
      'Level',
      'Status',
      'Tanggal Evaluasi',
    ]
  );

  return (
    <div className="reports-page-container mx-auto flex max-w-[1500px] flex-col gap-6 pb-8">
      {/* Global Print Stylesheet for Reports */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }

          /* 1. Sembunyikan elemen non-cetak */
          nav,
          aside,
          header.MuiAppBar-root,
          .no-print,
          .no-print * {
            display: none !important;
          }

          /* 2. Reset Layout Root & Container */
          html,
          body,
          #__next,
          main,
          div {
            overflow: visible !important;
          }

          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 9pt !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .reports-page-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 8px !important;
          }

          /* 3. Header Layar Disembunyikan saat Cetak */
          .reports-header-box {
            display: none !important;
          }

          /* 4. Kop Surat Resmi Khusus Print */
          .reports-kop-surat {
            display: block !important;
            width: 100% !important;
            margin-bottom: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .reports-kop-content {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 16px !important;
            width: 100% !important;
          }

          .reports-kop-logo-box {
            width: 170px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            flex-shrink: 0 !important;
          }

          .reports-kop-logo {
            height: 52px !important;
            max-height: 52px !important;
            width: auto !important;
            object-fit: contain !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .reports-kop-titles {
            flex: 1 !important;
            text-align: center !important;
          }

          .reports-kop-org {
            font-size: 11pt !important;
            font-weight: 700 !important;
            letter-spacing: 0.04em !important;
            color: #1e293b !important;
            text-transform: uppercase !important;
            margin: 0 !important;
            line-height: 1.25 !important;
          }

          .reports-kop-main {
            font-size: 14pt !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            color: #0f172a !important;
            text-transform: uppercase !important;
            margin: 3px 0 0 0 !important;
            line-height: 1.2 !important;
          }

          .reports-kop-meta {
            font-size: 8.5pt !important;
            color: #475569 !important;
            margin: 4px 0 0 0 !important;
            line-height: 1.3 !important;
            font-weight: 500 !important;
          }

          .reports-kop-bullet {
            margin: 0 6px !important;
            font-weight: bold !important;
            color: #94a3b8 !important;
          }

          .reports-kop-spacer {
            width: 170px !important;
            flex-shrink: 0 !important;
            display: block !important;
          }

          .reports-kop-divider {
            display: block !important;
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: 3.5px double #0f172a !important;
            width: 100% !important;
            margin-top: 8px !important;
            margin-bottom: 12px !important;
          }

          /* 5. Summary KPI Cards */
          .reports-summary-section {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 10px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .reports-summary-card {
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            box-shadow: none !important;
          }

          .reports-summary-num {
            font-size: 1.35rem !important;
            margin-top: 4px !important;
          }

          /* 5b. Ringkasan Eksekutif Per Kategori */
          .reports-executive-summary {
            margin-bottom: 10px !important;
            padding: 8px 12px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .reports-executive-summary table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 8pt !important;
          }

          .reports-executive-summary th {
            background-color: #f1f5f9 !important;
            color: #334155 !important;
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            padding: 4px 6px !important;
            border-bottom: 1.5px solid #94a3b8 !important;
          }

          .reports-executive-summary td {
            padding: 4px 6px !important;
            font-size: 8pt !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          /* 6. Tabel Rekapitulasi */
          .reports-table-container {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          .reports-table-scroll {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          table.reports-data-table {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            font-size: 8.5pt !important;
          }

          table.reports-data-table thead {
            display: table-header-group !important;
          }

          table.reports-data-table th {
            background-color: #f1f5f9 !important;
            color: #334155 !important;
            font-size: 8pt !important;
            font-weight: 700 !important;
            padding: 6px 8px !important;
            border-bottom: 1.5px solid #94a3b8 !important;
            white-space: nowrap !important;
            text-transform: uppercase !important;
          }

          table.reports-data-table td {
            padding: 5px 8px !important;
            font-size: 8.5pt !important;
            border-bottom: 1px solid #e2e8f0 !important;
            vertical-align: middle !important;
          }

          table.reports-data-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Badge & Print Color Adjust */
          .reports-badge {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />

      {/* 1. Header Cetak Formal / Kop Surat Resmi (Hanya tampil saat print) */}
      <div className="reports-kop-surat hidden print:block">
        <div className="reports-kop-content flex items-center justify-between gap-4">
          {/* Logo SLEC di sebelah kiri */}
          <div className="reports-kop-logo-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-slec.jpeg"
              alt="Logo SLEC"
              className="reports-kop-logo"
            />
          </div>

          {/* Judul formal di samping/tengah */}
          <div className="reports-kop-titles flex-1 text-center">
            <h2 className="reports-kop-org">
              SYNCRUM LOGISTICS EDUCATION CENTER (SLEC)
            </h2>
            <h1 className="reports-kop-main">
              LAPORAN REKAPITULASI EVALUASI OPERASIONAL
            </h1>
            <p className="reports-kop-meta">
              <span>Tanggal Cetak: {printDate || 'Terbaru'}</span>
              <span className="reports-kop-bullet">&bull;</span>
              <span>Filter: {categoryLabel}</span>
              <span className="reports-kop-bullet">&bull;</span>
              <span>Periode: {periodLabel}</span>
            </p>
          </div>

          {/* Spacer penyeimbang di kanan agar judul simetris di tengah halaman cetak */}
          <div className="reports-kop-spacer" aria-hidden="true" />
        </div>

        {/* Garis pembatas ganda horizontal di bawah header kop surat */}
        <div className="reports-kop-divider" />
      </div>

      {/* 2. Header Interaktif Web - Disembunyikan saat cetak */}
      <header className="reports-header-box no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="reports-header-title text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Laporan & Rekapitulasi Performa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Unduh dan analisis rekapitulasi data operasional driver secara komprehensif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 h-[38px]"
          >
            <Printer size={16} /> Unduh Laporan PDF
          </button>
          <button
            onClick={exportRows}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm h-[38px]"
          >
            <FileSpreadsheet size={16} /> Export Excel/CSV
          </button>
        </div>
      </header>

      {/* 2b. Container Filter Tersendiri */}
      <div className="no-print rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end gap-4">
          {/* Filter Rentang Tanggal Standar SLEC */}
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setStartDate('');
              setEndDate('');
            }}
          />
          <div className="flex flex-col min-w-[220px]">
            <label className="mb-1 text-xs font-semibold text-slate-600">Kategori</label>
            <select
              aria-label="Pilih kategori laporan"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 shadow-sm transition h-[38px]"
            >
              <option value="all">Rekapitulasi Seluruh Driver</option>
              <option value="driving">Laporan Khusus Driving</option>
              <option value="forklift">Laporan Khusus Forklift</option>
              <option value="retraining">Log Evaluasi Gagal / Retraining</option>
            </select>
          </div>
        </div>
      </div>

      <section className="reports-summary-section grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: 'Total Driver Terekap', value: filtered.length.toLocaleString('id-ID'), icon: Users, color: 'text-blue-600 bg-blue-50', sub: 'Berdasarkan filter aktif' },
          { label: 'Rata-Rata Skor Keseluruhan', value: average.toFixed(1), icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50', sub: 'Skala nilai 0 - 100' },
          { label: 'Persentase Kelulusan Operasional', value: `${passRate.toFixed(1)}%`, icon: Award, color: 'text-emerald-600 bg-emerald-50', sub: 'Berdasarkan filter aktif' },
          { label: 'Wajib Retraining', value: retraining.toLocaleString('id-ID'), icon: AlertTriangle, color: 'text-rose-600 bg-rose-50', sub: 'Berdasarkan filter aktif' },
        ]).map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="reports-summary-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <span className={`no-print rounded-xl p-2 ${color}`}><Icon size={18} /></span>
            </div>
            <p className="reports-summary-num mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="no-print mt-1 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </section>

      {/* 4. Tabel Ringkasan Eksekutif Per Kategori Assessment */}
      <section className="reports-executive-summary overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Ringkasan Eksekutif Per Kategori Assessment
            </h2>
            <p className="no-print mt-0.5 text-xs text-slate-500">
              Rekapitulasi performa dan tingkat kelulusan dinamis per program pelatihan berdasarkan filter aktif.
            </p>
          </div>
          <span className="no-print rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {filtered.length} Total Driver Terfilter
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap font-bold">Kategori Assessment</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center font-bold">Total Peserta</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right font-bold">Rata-Rata Skor</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center font-bold">Lulus (Pass)</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-center font-bold">Perlu Retraining (Fail)</th>
                <th className="px-5 py-3.5 whitespace-nowrap text-right font-bold">Tingkat Kelulusan (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programSummaries.map((cat) => (
                <tr key={cat.key} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${cat.colorBadge}`}>
                      {cat.title}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center font-semibold text-slate-700">
                    {cat.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right font-bold text-slate-900">
                    {cat.total > 0 ? cat.avgScore.toFixed(1) : '—'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center font-semibold text-emerald-600">
                    {cat.passed.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-center font-semibold text-rose-600">
                    {cat.failed.toLocaleString('id-ID')}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <span className={`inline-flex items-center font-bold ${cat.passRate >= 80 ? 'text-emerald-600' : cat.passRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {cat.total > 0 ? `${cat.passRate.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="reports-table-container overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_-4px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Rekapitulasi Performa Driver</h2>
            <p className="no-print mt-1 text-xs text-slate-500">Daftar rekapitulasi data performa operasional driver.</p>
          </div>
          <button onClick={exportRows} className="no-print hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex"><Download size={14} /> Unduh data</button>
        </div>
        <div className="reports-table-scroll overflow-x-auto">
          <table className="reports-data-table w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 whitespace-nowrap">No.</th>
                <th className="px-5 py-4 whitespace-nowrap">NAMA DRIVER & UNIT</th>
                <th className="px-5 py-4 whitespace-nowrap">Kategori / Program Terakhir</th>
                <th className="px-5 py-4 whitespace-nowrap">Skor Driving / Forklift</th>
                <th className="px-5 py-4 whitespace-nowrap">Level Kompetensi</th>
                <th className="px-5 py-4 whitespace-nowrap">Status Kelulusan</th>
                <th className="px-5 py-4 whitespace-nowrap">Tanggal Evaluasi</th>
              </tr>
            </thead>
            {/* Screen Tbody (Paginated) */}
            <tbody className="divide-y divide-slate-100 print:hidden">
              {visibleRows.map((row, index) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-medium text-slate-400">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Link href={`/assessment/history/${row.id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition capitalize">
                      {formatPersonName(row.driver)}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 flex-nowrap text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                        {row.plateOrUnit || row.nik}
                      </span>
                      {row.docNumber && (
                        <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap hidden sm:inline">
                          • {row.docNumber}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-600">{row.program}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={row.drivingAverage !== null && row.drivingAverage !== undefined ? "font-semibold text-indigo-700" : "font-medium text-slate-400"}>
                      {row.drivingAverage !== null && row.drivingAverage !== undefined ? row.drivingAverage.toFixed(1) : '—'}
                    </span>
                    <span className="mx-1.5 text-slate-300">/</span>
                    <span className={row.forkliftAverage !== null && row.forkliftAverage !== undefined ? "font-semibold text-sky-700" : "font-medium text-slate-400"}>
                      {row.forkliftAverage !== null && row.forkliftAverage !== undefined ? row.forkliftAverage.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`reports-badge inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${levelStyle[row.level]}`}>
                      {row.level}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`reports-badge rounded-full px-2.5 py-1 text-xs font-bold ${row.status === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                    {new Date(row.evaluationDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                    Belum ada data laporan pada filter ini.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Print Tbody (Prints ALL filtered records without pagination) */}
            <tbody className="hidden print:table-row-group divide-y divide-slate-200">
              {filtered.map((row, index) => (
                <tr key={`print-${row.id}`}>
                  <td>{index + 1}</td>
                  <td className="whitespace-nowrap">
                    <span className="font-semibold text-slate-800 capitalize">{formatPersonName(row.driver)}</span>
                    <div className="flex items-center gap-1 text-[8pt] text-slate-500 mt-0.5">
                      <span className="font-mono font-semibold">{row.plateOrUnit || row.nik}</span>
                      {row.docNumber && <span className="font-mono text-slate-400">• {row.docNumber}</span>}
                    </div>
                  </td>
                  <td className="text-slate-600">{row.program}</td>
                  <td className="whitespace-nowrap">
                    <span className={row.drivingAverage !== null && row.drivingAverage !== undefined ? "font-semibold text-indigo-700" : "text-slate-400"}>
                      {row.drivingAverage !== null && row.drivingAverage !== undefined ? row.drivingAverage.toFixed(1) : '—'}
                    </span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span className={row.forkliftAverage !== null && row.forkliftAverage !== undefined ? "font-semibold text-sky-700" : "text-slate-400"}>
                      {row.forkliftAverage !== null && row.forkliftAverage !== undefined ? row.forkliftAverage.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`reports-badge inline-flex rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${levelStyle[row.level]}`}>
                      {row.level}
                    </span>
                  </td>
                  <td>
                    <span className={`reports-badge rounded px-2 py-0.5 text-xs font-bold ${row.status === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {new Date(row.evaluationDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <p className="text-sm text-slate-500">
            Menampilkan <strong className="font-semibold text-slate-800">{filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)}</strong> dari <strong className="font-semibold text-slate-800">{filtered.length}</strong> data
          </p>
          <div className="flex flex-wrap items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sebelumnya
            </button>
            {getPageNumbers(page, totalPages).map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition ${
                    p === page
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
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

