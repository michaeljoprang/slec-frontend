'use client';

import React from 'react';
import {
  isForkliftAssessment,
  isForkliftRefreshment,
  isForkliftStandard,
  getAssessmentDisplayName,
  getPassingScore,
  formatAuditDocNumber,
  formatVehicleIdentifier,
  cleanTrainerNotes,
  extractDisqualificationReason,
  formatPersonName,
} from '@/lib/assessment';
import { FORKLIFT_REFRESHMENT_SECTIONS } from '@/features/assessment/forkliftRefreshment';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { DDT_SECTIONS } from '@/features/assessment/ddt';

export interface AssessmentPrintData {
  id?: string;
  assessmentType: string;
  trainingProgram?: string | null;
  assessmentDate: string;
  participantName: string;
  age?: string | number | null;
  simCategory?: string | null;
  simIssueDate?: string | null;
  simExpiryDate?: string | null;
  sioKemnaker?: string | null;
  vehicleType?: string | null;
  licensePlate?: string | null;
  testLocation?: string | null;
  instructor?: string | null;
  totalPoint?: number | null;
  totalDeduction?: number | null;
  actualPoint?: number | null;
  score: number | string;
  result: string;
  duration?: number | string | null;
  durationSeconds?: number | string | null;
  assessmentData?: {
    duration?: number | string | null;
    durationSeconds?: number | string | null;
  } | null;
  duration_seconds?: number | string | null;
  trainerNotes?: string | null;
  sections?: Array<{
    sectionCode?: string;
    sectionName?: string;
    totalPoint?: number;
    totalDeduction?: number;
    actualPoint?: number;
    answers?: Array<{
      itemId: string;
      itemName?: string;
      answer: string;
      deductionPoint: number;
    }>;
    items?: Array<{
      itemId: string;
      itemName?: string;
      answer: string;
      deductionPoint: number;
    }>;
  }>;
  frequencies?: Record<string, number>;
  answers?: Record<string, any>;
}

interface AssessmentPrintTemplateProps {
  data: AssessmentPrintData;
  duration?: number | string | null;
  className?: string;
}

const formatDateIndo = (isoDate?: string | null) => {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
};

const formatDuration = (seconds?: number | string | null) => {
  const numericSeconds = Number(seconds) || 0;
  const m = Math.floor(numericSeconds / 60);
  const s = numericSeconds % 60;
  return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
};

export default function AssessmentPrintTemplate({ data, duration, className = '' }: AssessmentPrintTemplateProps) {
  const isRefreshment = isForkliftRefreshment(data.assessmentType);
  const isStandard = isForkliftStandard(data.assessmentType);
  const isDDT = data.assessmentType === 'DDT';

  const docNumber = formatAuditDocNumber(data.id, data.assessmentType, data.assessmentDate);

  const assessmentName = getAssessmentDisplayName(data.assessmentType);
  const passingScore = getPassingScore(data.assessmentType);

  const numScore = typeof data.score === 'number' ? data.score : parseFloat(String(data.score)) || 0;
  const formattedScore = isRefreshment ? Math.round(numScore).toString() : numScore.toFixed(1);

  const maxTotalPoint = isRefreshment ? 277 : isStandard ? 134 : 100;
  const totalDed = data.totalDeduction != null ? Number(data.totalDeduction) : 0;
  const actualPt = data.actualPoint != null ? Number(data.actualPoint) : Math.max(0, maxTotalPoint - totalDed);
  const rawDuration = data.durationSeconds ?? data.duration ?? duration ?? data.duration_seconds ?? data.assessmentData?.durationSeconds ?? data.assessmentData?.duration;
  const durationSeconds = rawDuration == null ? 0 : Number(rawDuration);
  const displayDurationSeconds = !Number.isNaN(durationSeconds) ? durationSeconds : 0;

  // Map answers from DB if provided
  const itemMap: Record<string, { answer: string; deductionPoint: number }> = {};
  if (data.sections) {
    for (const sec of data.sections) {
      const list = sec.answers || sec.items || [];
      for (const ans of list) {
        if (ans.itemId) {
          itemMap[ans.itemId] = {
            answer: String(ans.answer || '0'),
            deductionPoint: Number(ans.deductionPoint || 0),
          };
        }
      }
    }
  }

  // Get frequency helper
  const getFreq = (itemId: string): number => {
    if (data.frequencies && data.frequencies[itemId] !== undefined) {
      return Number(data.frequencies[itemId]) || 0;
    }
    if (itemMap[itemId] !== undefined) {
      return parseInt(itemMap[itemId].answer, 10) || 0;
    }
    return 0;
  };

  // Get DDT answer helper
  const getDdtAnswer = (itemId: string): string => {
    if (data.answers && data.answers[itemId] !== undefined) {
      return String(data.answers[itemId] || '—');
    }
    if (itemMap[itemId] !== undefined) {
      return String(itemMap[itemId].answer || '—');
    }
    return 'YES';
  };

  // Status kelulusan text & styles
  const isPass = data.result === 'PASS';
  const fatalReason = extractDisqualificationReason(data.trainerNotes);
  const isDisqualified = data.result === 'DISQUALIFIED' || Boolean(fatalReason);

  // Forklift unit/assessment detection
  const isForklift =
    isForkliftAssessment(data.assessmentType) ||
    (data.vehicleType || '').toLowerCase().includes('forklift');

  // SIO Kemnaker extraction & fallback
  const sioMatch = data.trainerNotes?.match(/\[SIO Kemnaker:\s*([^\]]+)\]/);
  const rawSio = (data.sioKemnaker || '').trim() || (sioMatch ? sioMatch[1].trim() : '');
  const effectiveSioKemnaker = rawSio || (isForklift ? 'Tidak ada' : '—');

  // SIM category & validity formatting
  const rawSimCategory = (data.simCategory || '').trim();
  const isNoSim =
    !rawSimCategory ||
    rawSimCategory.toLowerCase() === 'tidak ada' ||
    rawSimCategory === '-' ||
    rawSimCategory === '—';
  const formattedSim = isNoSim
    ? 'Tidak Ada'
    : `${rawSimCategory}${
        data.simExpiryDate &&
        data.simExpiryDate !== '-' &&
        data.simExpiryDate !== '—'
          ? ` (s/d ${formatDateIndo(data.simExpiryDate)})`
          : ''
      }`;

  // Vehicle type formatting
  const formattedVehicle = data.vehicleType || (isForklift ? 'Forklift' : 'Truk');

  // Plate / unit number formatting
  const formattedPlate = formatVehicleIdentifier(data.licensePlate, isForklift);

  // Training program formatting (support NEOP, Refreshment, Retraining, Test Drive, Standard)
  let formattedProgram = (data.trainingProgram || '').trim();
  if (!formattedProgram) {
    if (isRefreshment) formattedProgram = 'Refreshment';
    else if (isStandard) formattedProgram = 'Standard';
    else formattedProgram = 'Standard';
  } else {
    const progUpper = formattedProgram.toUpperCase();
    if (progUpper.includes('NEOP') || progUpper.includes('NEW EMPLOYEE')) formattedProgram = 'NEOP';
    else if (progUpper === 'REFRESHMENT') formattedProgram = 'Refreshment';
    else if (progUpper === 'TEST_DRIVE' || progUpper === 'TEST DRIVE') formattedProgram = 'Test Drive';
    else if (progUpper === 'RETRAINING') formattedProgram = 'Retraining';
    else if (progUpper === 'STANDARD') formattedProgram = 'Standard';
  }

  // Location & Instructor
  const formattedLocation = data.testLocation || 'CCR CIBITUNG 1';
  const formattedInstructor = formatPersonName(data.instructor) || '—';

  // Clean trainer notes (strip metadata machine tags)
  const cleanNotes = cleanTrainerNotes(data.trainerNotes || (data as any).notes);

  return (
    <div className={`slec-print-document ${className}`}>
      {/* Global Print Stylesheet */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 10mm 10mm;
          }

          /* 1. BUKA KUNCI OVERFLOW UNTUK SELURUH PARENT WRAPPER APLIKASI */
          html,
          body,
          #__next,
          body > div,
          main,
          div,
          .MuiBox-root,
          [class*="layout"],
          [class*="app"] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            position: static !important;
          }

          html,
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 10px !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }

          /* Sembunyikan elemen navigasi dan non-print */
          nav,
          aside,
          header,
          .MuiDrawer-root,
          .hide-on-print,
          .no-print {
            display: none !important;
          }

          .slec-print-document {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            image-rendering: -webkit-optimize-contrast;
          }

          /* 2. ELEMEN BESAR BOLEH TERPOTONG SECARA NATURAL (DIV, TABLE, TBODY) */
          div,
          section,
          article,
          table,
          tbody,
          .slec-print-table,
          .slec-print-table tbody,
          .slec-notes-container {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          /* 3. JUDUL SECTION TIDAK TERPISAH SENDIRIAN DI BAWAH HALAMAN */
          .slec-section-title {
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* 4. CEGAH TERBELAH HANYA PADA: THEAD, TR, DAN KOTAK HEADER / METADATA / TANDA TANGAN */
          thead,
          .slec-print-table thead {
            display: table-header-group !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tr,
          .slec-print-table tr,
          .slec-print-table tbody tr,
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          div.slec-header-container,
          div.slec-metadata-container,
          div.slec-signature-container,
          .slec-header-container,
          .slec-metadata-container,
          .slec-signature-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }

        .slec-print-document {
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
          line-height: 1.35;
          font-size: 10.5px;
        }

        .slec-print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }

        .slec-print-table th,
        .slec-print-table td {
          border: 1px solid #374151;
          padding: 4px 6px;
        }

        .slec-print-table th {
          background-color: #f3f4f6;
          font-weight: 700;
          text-align: center;
          font-size: 10px;
        }

        .slec-section-title {
          background-color: #e5e7eb;
          font-weight: 700;
          font-size: 11px;
          color: #111827;
          border: 1px solid #374151;
          padding: 4px 8px;
          margin-top: 8px;
          text-transform: uppercase;
          page-break-after: avoid;
          break-after: avoid;
        }
      `,
        }}
      />

      {/* ============================================================== */}
      {/* BAGIAN 1: KOP / HEADER FORM PENILAIAN RESMI                     */}
      {/* ============================================================== */}
      <div
        className="slec-header-container print-avoid-break"
        style={{
          border: '2px solid #111827',
          padding: '8px 12px',
          marginBottom: '10px',
          backgroundColor: '#ffffff',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1.5px solid #111827',
            paddingBottom: '8px',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* SLEC Official Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: '#ffffff',
                padding: '2px',
              }}
            >
              <img
                src="/images/slec-logo.jpeg"
                alt="SLEC Logo"
                style={{
                  height: '46px',
                  width: 'auto',
                  maxWidth: '140px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#111827',
                  lineHeight: 1.2,
                }}
              >
                SYNCRUM LOGISTICS EDUCATION CENTER (SLEC)
              </div>
              <div
                style={{
                  fontSize: '8.5px',
                  color: '#4b5563',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginTop: '2px',
                }}
              >
                PT SYNCRUM LOGISTICS &bull; Professional Assessment, Safety Training & Driver Certification
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#374151', lineHeight: '1.5' }}>
            <div>
              <strong>No. Dokumen:</strong> {docNumber}
            </div>
            <div>
              <strong>Tgl Cetak:</strong> {new Date().toLocaleDateString('id-ID')}
            </div>
            {isForklift && (
              <div
                style={{
                  fontSize: '8.5px',
                  color: '#047857',
                  fontWeight: 700,
                  marginTop: '1px',
                }}
              >
                STANDAR OPERASIONAL SLEC
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '14.5px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#111827',
            }}
          >
            LEMBAR PENILAIAN ASESMEN {isForklift ? 'OPERATOR FORKLIFT' : 'DRIVER TRUK'}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#374151',
              marginTop: '2px',
            }}
          >
            {assessmentName} &bull; PROGRAM TRAINING:{' '}
            <span style={{ textDecoration: 'underline', color: '#111827' }}>
              {formattedProgram}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BAGIAN 2: INFORMASI PESERTA & RINGKASAN NILAI (2 KOLOM)         */}
      {/* ============================================================== */}
      <div
        className="slec-metadata-container print-avoid-break"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: '10px',
          marginBottom: '10px',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        {/* Kolom Kiri: Informasi Peserta */}
        <div style={{ border: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              backgroundColor: '#1f2937',
              color: '#ffffff',
              fontWeight: 700,
              padding: '4px 8px',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Data Identitas Peserta & Pengujian
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px' }}>
            <tbody>
              <tr>
                <td style={{ width: '38%', padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Nama Peserta
                </td>
                <td style={{ width: '62%', padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>
                  {formatPersonName(data.participantName) || '—'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Umur Peserta
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                  {data.age && data.age !== '-' ? `${data.age} Tahun` : '—'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Program Training
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: '#111827' }}>
                  {formattedProgram}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Jenis Kendaraan
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827', fontWeight: 600 }}>
                  {formattedVehicle}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  {isForklift ? 'No. Body' : 'No. Polisi'}
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827', fontWeight: 600 }}>
                  {formattedPlate}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Gol. SIM & Berlaku
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                  {formattedSim}
                </td>
              </tr>
              <tr style={isForklift ? { backgroundColor: '#f0fdf4' } : undefined}>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: isForklift ? '#065f46' : '#4b5563' }}>
                  SIO Kemnaker {isForklift ? <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#047857' }}>(Unit Forklift)</span> : null}
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827', fontWeight: isForklift ? 700 : 500 }}>
                  {effectiveSioKemnaker}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Lokasi Test
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                  {formattedLocation}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>
                  Tanggal Uji
                </td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', color: '#111827' }}>
                  {formatDateIndo(data.assessmentDate)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', fontWeight: 600, color: '#4b5563' }}>
                  Instruktur / Penguji
                </td>
                <td style={{ padding: '3px 6px', color: '#111827', fontWeight: 700 }}>
                  {formattedInstructor}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kolom Kanan: Ringkasan Nilai & Hasil */}
        <div style={{ border: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#1f2937', color: '#ffffff', fontWeight: 700, padding: '4px 8px', fontSize: '10.5px', textTransform: 'uppercase' }}>
            Rekapitulasi Skor & Kelulusan
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>Total Poin Maksimal</td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 700 }}>{maxTotalPoint}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>Total Pengurangan</td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 700, color: totalDed > 0 ? '#b91c1c' : '#111827' }}>
                  {totalDed > 0 ? `-${totalDed}` : '0'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>Durasi Operasi</td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>{formatDuration(displayDurationSeconds)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, color: '#4b5563' }}>Poin Aktual</td>
                <td style={{ padding: '3px 6px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 700 }}>{actualPt}</td>
              </tr>
            </tbody>
          </table>

          {/* Kotak Besar Skor & Status */}
          <div
            style={{
              margin: '6px',
              padding: '6px',
              border: `2px solid ${isPass ? '#059669' : '#dc2626'}`,
              backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
              textAlign: 'center',
              borderRadius: '4px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#4b5563' }}>
              Nilai Akhir Peserta
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.1, color: isPass ? '#065f46' : '#991b1b', margin: '2px 0' }}>
              {formattedScore} <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>/ 100</span>
            </div>
            <div
              style={{
                display: 'inline-block',
                margin: '2px auto',
                padding: '2px 10px',
                borderRadius: '3px',
                backgroundColor: isPass ? '#059669' : '#dc2626',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '11px',
                letterSpacing: '0.05em',
              }}
            >
              {isDisqualified ? 'DISKUALIFIKASI' : isPass ? 'LULUS (PASS)' : 'TIDAK LULUS (FAIL)'}
            </div>
            <div style={{ fontSize: '8.5px', color: '#4b5563', marginTop: '2px' }}>
              {fatalReason
                ? `Pelanggaran Fatal: ${fatalReason}`
                : isDisqualified
                ? `Waktu melebihi batas maksimal (${isRefreshment ? '15 Menit' : '10 Menit'})`
                : `Standar Minimal Lulus: ${passingScore} Poin`}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BAGIAN 3: TABEL RINCIAN CHECKLIST ITEM LENGKAP                   */}
      {/* ============================================================== */}
      <div className="mt-6" style={{ marginTop: '20px', marginBottom: '10px' }}>
        {/* 1. JIKA TIPE FORKLIFT - REFRESHMENT */}
        {isRefreshment && (
          <div>
            {FORKLIFT_REFRESHMENT_SECTIONS.map((sec) => {
              let secMistakes = 0;
              let secDeduction = 0;
              return (
                <div
                  key={sec.code}
                  style={{
                    marginBottom: '8px',
                  }}
                >
                  <div
                    className="slec-section-title print:break-after-avoid"
                    style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}
                  >
                    {sec.name} (Batas Bobot: {sec.totalPoint} Poin)
                  </div>
                  <table className="slec-print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>No</th>
                        <th style={{ textAlign: 'left' }}>Item Penilaian</th>
                        <th style={{ width: '50px' }}>Bobot</th>
                        <th style={{ width: '45px' }}>Plan</th>
                        <th style={{ width: '45px' }}>Freq</th>
                        <th style={{ width: '75px' }}>Total Minus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.items.map((item, itemIdx) => {
                        const freq = getFreq(item.id);
                        const itemMinus = freq * item.deduction;
                        secMistakes += freq;
                        secDeduction += itemMinus;

                        return (
                          <tr
                            key={item.id}
                            className="print-avoid-break"
                            style={{
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                              backgroundColor: freq > 0 ? '#fef2f2' : (itemIdx % 2 === 1 ? '#f9fafb' : '#ffffff'),
                            }}
                          >
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{itemIdx + 1}</td>
                            <td>{item.label}</td>
                            <td style={{ textAlign: 'center' }}>{item.deduction}</td>
                            <td style={{ textAlign: 'center' }}>{item.plan}</td>
                            <td style={{ textAlign: 'center', fontWeight: freq > 0 ? 800 : 400, color: freq > 0 ? '#dc2626' : '#111827' }}>
                              {freq}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: freq > 0 ? 800 : 400, color: freq > 0 ? '#dc2626' : '#6b7280' }}>
                              {itemMinus > 0 ? `-${itemMinus}` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotal row */}
                      <tr
                        className="print-avoid-break"
                        style={{
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          backgroundColor: '#f3f4f6',
                          fontWeight: 700,
                        }}
                      >
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: '12px' }}>
                          SUBTOTAL {sec.code} ({sec.name.split(':')[0]})
                        </td>
                        <td style={{ textAlign: 'center' }}>{sec.totalPoint}</td>
                        <td style={{ textAlign: 'center' }}>—</td>
                        <td style={{ textAlign: 'center', color: secMistakes > 0 ? '#dc2626' : '#111827' }}>{secMistakes}x</td>
                        <td style={{ textAlign: 'right', color: secDeduction > 0 ? '#dc2626' : '#111827' }}>
                          {secDeduction > 0 ? `-${secDeduction}` : '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. JIKA TIPE FORKLIFT - STANDARD */}
        {isStandard && (
          <div>
            {TMMIN_CHECKLIST_DATA.map((sec) => {
              let secMistakes = 0;
              let secDeduction = 0;
              return (
                <div
                  key={sec.code}
                  style={{
                    marginBottom: '8px',
                  }}
                >
                  <div
                    className="slec-section-title print:break-after-avoid"
                    style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}
                  >
                    {sec.name} ({sec.code})
                  </div>
                  <table className="slec-print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>No</th>
                        <th style={{ textAlign: 'left' }}>Item Penilaian</th>
                        <th style={{ width: '55px' }}>Bobot</th>
                        <th style={{ width: '55px' }}>Freq</th>
                        <th style={{ width: '80px' }}>Total Minus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.items.map((item, itemIdx) => {
                        const freq = getFreq(item.id);
                        const itemMinus = freq * item.deduction;
                        secMistakes += freq;
                        secDeduction += itemMinus;

                        return (
                          <tr
                            key={item.id}
                            className="print-avoid-break"
                            style={{
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                              backgroundColor: freq > 0 ? '#fef2f2' : (itemIdx % 2 === 1 ? '#f9fafb' : '#ffffff'),
                            }}
                          >
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{itemIdx + 1}</td>
                            <td>{item.label}</td>
                            <td style={{ textAlign: 'center' }}>{item.deduction}</td>
                            <td style={{ textAlign: 'center', fontWeight: freq > 0 ? 800 : 400, color: freq > 0 ? '#dc2626' : '#111827' }}>
                              {freq}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: freq > 0 ? 800 : 400, color: freq > 0 ? '#dc2626' : '#6b7280' }}>
                              {itemMinus > 0 ? `-${itemMinus}` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotal row */}
                      <tr
                        className="print-avoid-break"
                        style={{
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          backgroundColor: '#f3f4f6',
                          fontWeight: 700,
                        }}
                      >
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: '12px' }}>
                          SUBTOTAL {sec.code}
                        </td>
                        <td style={{ textAlign: 'center' }}>—</td>
                        <td style={{ textAlign: 'center', color: secMistakes > 0 ? '#dc2626' : '#111827' }}>{secMistakes}x</td>
                        <td style={{ textAlign: 'right', color: secDeduction > 0 ? '#dc2626' : '#111827' }}>
                          {secDeduction > 0 ? `-${secDeduction}` : '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. JIKA TIPE DDT (TRUCK ASSESSMENT) */}
        {isDDT && (
          <div>
            {DDT_SECTIONS.map((sec) => {
              let secDeduction = 0;
              let noCount = 0;
              let yesCount = 0;
              return (
                <div
                  key={sec.id}
                  style={{
                    marginBottom: '8px',
                  }}
                >
                  <div
                    className="slec-section-title print:break-after-avoid"
                    style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}
                  >
                    {sec.title || sec.label} (Maks. {sec.totalPoint} Poin)
                  </div>
                  <table className="slec-print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '32px' }}>No</th>
                        <th style={{ textAlign: 'left' }}>Item Penilaian</th>
                        <th style={{ width: '50px' }}>Poin</th>
                        <th style={{ width: '65px' }}>Hasil</th>
                        <th style={{ width: '80px' }}>Pengurangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.items.map((item, itemIdx) => {
                        const ans = getDdtAnswer(item.id);
                        const isNo = ans === 'NO';
                        const itemMinus = isNo ? (item.deductionPoint || 2) : 0;
                        if (isNo) noCount++;
                        else if (ans === 'YES') yesCount++;
                        secDeduction += itemMinus;

                        return (
                          <tr
                            key={item.id}
                            className="print-avoid-break"
                            style={{
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                              backgroundColor: isNo ? '#fef2f2' : (itemIdx % 2 === 1 ? '#f9fafb' : '#ffffff'),
                            }}
                          >
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{itemIdx + 1}</td>
                            <td>{item.description}</td>
                            <td style={{ textAlign: 'center' }}>{item.deductionPoint || 2}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: isNo ? '#dc2626' : (ans === 'YES' ? '#059669' : '#6b7280') }}>
                              {ans}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: isNo ? 800 : 400, color: isNo ? '#dc2626' : '#6b7280' }}>
                              {itemMinus > 0 ? `-${itemMinus}` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Subtotal row */}
                      <tr
                        className="print-avoid-break"
                        style={{
                          pageBreakInside: 'avoid',
                          breakInside: 'avoid',
                          backgroundColor: '#f3f4f6',
                          fontWeight: 700,
                        }}
                      >
                        <td colSpan={2} style={{ textAlign: 'right', paddingRight: '12px' }}>
                          SUBTOTAL {sec.title || sec.label} (YES: {yesCount}, NO: {noCount})
                        </td>
                        <td style={{ textAlign: 'center' }}>{sec.totalPoint}</td>
                        <td style={{ textAlign: 'center' }}>—</td>
                        <td style={{ textAlign: 'right', color: secDeduction > 0 ? '#dc2626' : '#111827' }}>
                          {secDeduction > 0 ? `-${secDeduction}` : '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* CATATAN & EVALUASI INSTRUKTUR (JIKA ADA)                         */}
      {/* ============================================================== */}
      <div
        className="slec-notes-container print-avoid-break"
        style={{
          border: '1px solid #374151',
          padding: '6px 10px',
          marginBottom: '10px',
          backgroundColor: '#fafafa',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px', color: '#111827' }}>
          Catatan & Rekomendasi Instruktur:
        </div>
        <div style={{ fontSize: '10px', color: '#374151', minHeight: '28px' }}>
          {cleanNotes || '-'}
        </div>
      </div>

      {/* ============================================================== */}
      {/* BAGIAN 4: KOLOM TANDA TANGAN (FOOTER DOKUMEN RESMI)             */}
      {/* ============================================================== */}
      <div
        className="print-avoid-break slec-signature-container"
        style={{
          border: '1.5px solid #111827',
          padding: '10px 16px',
          marginBottom: '8px',
          backgroundColor: '#ffffff',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          {/* Kolom Tanda Tangan Peserta */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
              Peserta / Driver / Operator
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
              Tanggal: {formatDateIndo(data.assessmentDate)}
            </div>
            <div style={{ height: '55px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '80%', borderBottom: '1px solid #111827' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '11px', marginTop: '4px', color: '#111827', textTransform: 'capitalize' }}>
              ( {formatPersonName(data.participantName) || 'Peserta Ujian'} )
            </div>
          </div>

          {/* Kolom Tanda Tangan Instruktur */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>
              Instruktur / Penguji SLEC
            </div>
            <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
              Tanggal: {formatDateIndo(data.assessmentDate)}
            </div>
            <div style={{ height: '55px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '80%', borderBottom: '1px solid #111827' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '11px', marginTop: '4px', color: '#111827', textTransform: 'capitalize' }}>
              ( {formatPersonName(data.instructor) || 'Instruktur SLEC'} )
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info Legal */}
      <div style={{ textAlign: 'center', fontSize: '8px', color: '#6b7280', marginTop: '4px' }}>
        Dokumen ini merupakan catatan resmi hasil pengujian keselamatan berkendara Syncrum Logistics Education Center (SLEC) dan berlaku sebagai lembar evaluasi kompetensi.
      </div>
    </div>
  );
}
