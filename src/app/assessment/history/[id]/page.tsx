'use client';

import React, { useEffect, useState } from 'react';

import {
  Box,
  Paper,
  Typography,
  Button,
  Skeleton,
  Alert,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import { ArrowLeft, History, CheckCircle2, XCircle } from 'lucide-react';
import PrintIcon from '@mui/icons-material/Print';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ResultBadge from '@/components/common/ResultBadge';
import {
  getAssessmentDisplayName,
  isForkliftRefreshment,
  getTrainingProgramLabel,
  formatAuditDocNumber,
  formatVehicleIdentifier,
  cleanTrainerNotes,
  extractDisqualificationReason,
  formatPersonName,
  getAssessmentTimeLimits,
  getSectionTimeLimit,
} from '@/lib/assessment';
import { tokens } from '@/lib/themeTokens';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { FORKLIFT_REFRESHMENT_SECTIONS } from '@/features/assessment/forkliftRefreshment';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import AssessmentPrintTemplate from '@/components/assessment/AssessmentPrintTemplate';
import InlineTimerEditor from '@/components/assessment/InlineTimerEditor';

function getLabelForItemId(itemId: string, assessmentType: string): string {
  if (assessmentType === 'TMMIN_REFRESHMENT') {
    for (const sec of FORKLIFT_REFRESHMENT_SECTIONS) {
      const item = sec.items.find(i => i.id === itemId);
      if (item) return item.label;
    }
  } else if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
    for (const sec of TMMIN_CHECKLIST_DATA) {
      const item = sec.items.find(i => i.id === itemId);
      if (item) return item.label;
    }
  } else {
    for (const sec of DDT_SECTIONS) {
      const item = sec.items.find(i => i.id === itemId);
      if (item) return item.description;
    }
  }
  return `Item ${itemId}`;
}

interface AnswerRow {
  id: string;
  itemId: string;
  itemName?: string;
  answer: string;
  deductionPoint: number;
}

interface SectionRow {
  id: string;
  sectionCode: string;
  sectionName: string;
  totalPoint: number;
  totalDeduction: number;
  actualPoint: number;
  durationSeconds?: number;
  answers: AnswerRow[];
}

interface AssessmentDetail {
  id: string;
  assessmentType: string;
  assessmentDate: string;
  participantName: string;
  age: string;
  simCategory: string;
  simIssueDate: string;
  simExpiryDate: string;
  sioKemnaker?: string;
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  totalPoint: number;
  totalDeduction: number;
  actualPoint: number;
  score: string | number;
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED';
  trainingProgram?: string;
  duration?: number | string | null;
  durationSeconds?: number | string | null;
  sectionDurations?: Record<string, number>;
  trainerNotes: string | null;
  createdAt: string;
  sections: SectionRow[];
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

const formatDuration = (seconds?: number | string | null) => {
  const numericSeconds = Number(seconds) || 0;
  const minutes = Math.floor(numericSeconds / 60);
  const remainingSeconds = numericSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

interface PageProps {
  params: { id: string };
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get('print') === 'true';

  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && data && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, data, autoPrint]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/assessments/${id}`, { cache: 'no-store' })
      .then((res) => {
        if (res.status === 404) throw new Error('Assessment tidak ditemukan');
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const item = json.data || json;

        let computedTotalDeduction = 0;
        let computedTotalPoint = item.totalPoint || (item.assessmentType === 'TMMIN_REFRESHMENT' ? 277 : item.assessmentType === 'TMMIN' || item.assessmentType === 'TMMIN_STANDARD' ? 134 : 100);
        const sectionDurations = item.sectionDurations || {};

        const mappedSections = (item.sections || []).map((sec: any) => {
          let secDeduction = 0;
          const mappedAnswers = (sec.answers || []).map((ans: any) => {
            secDeduction += ans.deductionPoint || 0;
            return {
              id: ans.id,
              itemId: ans.itemId,
              itemName: ans.itemName || getLabelForItemId(ans.itemId, item.assessmentType || 'DDT'),
              answer: ans.answer,
              deductionPoint: ans.deductionPoint || 0,
            };
          });

          computedTotalDeduction += secDeduction;

          return {
            id: sec.id,
            sectionCode: sec.sectionCode || 'UNKNOWN',
            sectionName: sec.sectionName || sec.sectionCode,
            totalPoint: sec.totalPoint || 0,
            totalDeduction: sec.totalDeduction > 0 ? sec.totalDeduction : secDeduction,
            actualPoint: sec.actualPoint || 0,
            durationSeconds: sec.durationSeconds ?? sectionDurations[sec.sectionCode] ?? 0,
            answers: mappedAnswers,
          };
        });

        const sioMatch = (item.trainerNotes || '').match(/\[SIO Kemnaker:\s*([^\]]+)\]/);
        const sioExtracted = sioMatch ? sioMatch[1].trim() : '';

        const resolvedDuration = Number(item.durationSeconds ?? item.duration ?? 0);

        const mappedData = {
          ...item,
          totalPoint: computedTotalPoint,
          totalDeduction: item.totalDeduction > 0 ? item.totalDeduction : computedTotalDeduction,
          actualPoint: item.actualPoint || item.score,
          sections: mappedSections,
          sectionDurations,
          age: item.age || '-',
          simCategory: item.simCategory || '-',
          simIssueDate: item.simIssueDate || '-',
          simExpiryDate: item.simExpiryDate || '-',
          sioKemnaker: item.sioKemnaker || sioExtracted || '',
          duration: resolvedDuration,
          durationSeconds: resolvedDuration,
          trainerNotes: item.trainerNotes || null,
        };
        setData(mappedData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Clean Overwrite Handler for Total Duration
  const handleSaveTotalDuration = async (newSeconds: number) => {
    if (!data) return;
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds: newSeconds }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan durasi total baru');
      }
      const updated = await res.json();
      const finalSecs = updated.durationSeconds !== undefined ? Number(updated.durationSeconds) : newSeconds;

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          duration: finalSecs,
          durationSeconds: finalSecs,
          score: updated.score !== undefined ? updated.score : prev.score,
          result: updated.result !== undefined ? updated.result : prev.result,
          totalDeduction: updated.totalDeduction !== undefined ? updated.totalDeduction : prev.totalDeduction,
          actualPoint: updated.actualPoint !== undefined ? updated.actualPoint : prev.actualPoint,
        };
      });
      router.refresh();
    } catch (err: any) {
      console.error('Failed to update total duration:', err);
      alert(err.message || 'Gagal menyimpan durasi total');
      throw err;
    }
  };

  // Clean Overwrite Handler for Individual Section Duration
  const handleSaveSectionDuration = async (sectionCode: string, newSecSeconds: number) => {
    if (!data) return;
    try {
      const currentSectionDurations = data.sectionDurations || {};
      const updatedSectionDurations = {
        ...currentSectionDurations,
        [sectionCode]: newSecSeconds,
      };
      // Automatically recalculate total duration from the sum of all sections' durations
      const newTotalSeconds = Object.values(updatedSectionDurations).reduce(
        (sum, s) => sum + (Number(s) || 0),
        0
      );

      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionDurations: updatedSectionDurations,
          durationSeconds: newTotalSeconds,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan durasi seksi baru');
      }
      const updated = await res.json();
      const finalSecs = updated.durationSeconds !== undefined ? Number(updated.durationSeconds) : newTotalSeconds;

      setData((prev) => {
        if (!prev) return null;
        const mappedSecs = prev.sections.map((s) => {
          if (s.sectionCode === sectionCode) {
            return { ...s, durationSeconds: newSecSeconds };
          }
          return s;
        });
        return {
          ...prev,
          duration: finalSecs,
          durationSeconds: finalSecs,
          sectionDurations: updatedSectionDurations,
          sections: mappedSecs,
          score: updated.score !== undefined ? updated.score : prev.score,
          result: updated.result !== undefined ? updated.result : prev.result,
          totalDeduction: updated.totalDeduction !== undefined ? updated.totalDeduction : prev.totalDeduction,
          actualPoint: updated.actualPoint !== undefined ? updated.actualPoint : prev.actualPoint,
        };
      });
      router.refresh();
    } catch (err: any) {
      console.error('Failed to update section duration:', err);
      alert(err.message || 'Gagal menyimpan durasi seksi');
      throw err;
    }
  };

  const isPassing = data?.result === 'PASS';
  const scoreNum = data ? parseFloat(String(data.score)) : 0;

  let disqualificationReasons: string[] = [];
  let manualFatalReason: string | null = null;
  let isOvertime = false;

  if (data && (data.result === 'FAIL' || data.result === 'DISQUALIFIED')) {
    const isRefreshment = isForkliftRefreshment(data.assessmentType);
    const maxDurationSeconds = isRefreshment ? 900 : 600;
    const maxDurationText = isRefreshment ? '15m 00s' : '10m 00s';
    const durationNum = Number(data.duration) || Number(data.durationSeconds) || 0;
    isOvertime = durationNum > maxDurationSeconds;

    // a. Cek apakah durasi ujian melebihi batas waktu maksimal
    if (isOvertime) {
      disqualificationReasons.push(
        `Diskualifikasi Waktu: Durasi ujian (${formatDuration(durationNum)}) melebihi batas waktu maksimal (${maxDurationText}).`
      );
    }

    // b. Cek alasan diskualifikasi manual dari trainer (Fatal Error / Human Error)
    manualFatalReason = extractDisqualificationReason(data.trainerNotes);
    if (manualFatalReason) {
      disqualificationReasons.push(
        `Diskualifikasi (Pelanggaran Fatal): ${manualFatalReason}`
      );
    }

    // c. Jika gagal murni karena skor di bawah Passing Grade (< 70)
    const passingScore = isRefreshment ? 75 : 70;
    if (scoreNum < passingScore && !manualFatalReason && !isOvertime) {
      disqualificationReasons.push(
        `Tidak Lulus: Skor akhir di bawah standar kelulusan minimal (Passing Grade ${passingScore}).`
      );
    }

    // Fallback jika status DISQUALIFIED tetapi tidak ada rincian di atas
    if (disqualificationReasons.length === 0 && data.result === 'DISQUALIFIED') {
      disqualificationReasons.push('Diskualifikasi: Pelanggaran fatal atau diskualifikasi oleh penguji.');
    } else if (disqualificationReasons.length === 0 && data.result === 'FAIL') {
      disqualificationReasons.push(`Tidak Lulus: Skor akhir (${scoreNum.toFixed(1)}) tidak memenuhi standar kelulusan minimal.`);
    }
  }

  return (
    <AppShell pageTitle="Detail Assessment">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media screen {
          .print-only {
            display: none !important;
          }
        }
        @media print {
          html,
          body,
          #__next,
          body > div,
          main {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            display: block !important;
            position: static !important;
          }
          nav, aside, header, .MuiDrawer-root, .hide-on-print {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .print-only {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `,
        }}
      />
      <Box className="hide-on-print" sx={{ maxWidth: 1100, mx: 'auto' }}>

        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              className="hide-on-print"
              component={Link}
              href="/assessment/history"
              variant="outlined"
              startIcon={<ArrowLeft size={16} />}
              size="small"
              sx={{ mr: 1 }}
            >
              Kembali
            </Button>
            <History size={22} color={tokens.colors.primaryLight} className="hide-on-print" />
            <Box>
              <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
                Detail Assessment
              </Typography>
              <Typography variant="body2" className="capitalize" sx={{ color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>
                {loading ? 'Memuat...' : (data ? formatPersonName(data.participantName) : '—')}
              </Typography>
            </Box>
          </Box>
          <Button
            className="hide-on-print"
            variant="contained"
            startIcon={<PrintIcon fontSize="small" />}
            size="small"
            onClick={() => window.print()}
            sx={{ fontWeight: 600, bgcolor: tokens.colors.primary, '&:hover': { bgcolor: '#0e6b63' } }}
          >
            Cetak Hard Copy / PDF
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} sx={{ p: 3 }}>
                <Skeleton variant="text" height={32} width="40%" />
                <Skeleton variant="rectangular" height={80} sx={{ mt: 1 }} />
              </Paper>
            ))}
          </Box>
        )}

        {!loading && data && (
          <>
            {/* Result banner */}
            <Paper
              sx={{
                p: { xs: 2.5, sm: 3 },
                mb: 2,
                border: `2px solid ${isPassing ? tokens.colors.status.success : tokens.colors.status.danger}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                {isPassing
                  ? <CheckCircle2 size={40} color={tokens.colors.status.success} strokeWidth={1.5} />
                  : <XCircle size={40} color={tokens.colors.status.danger} strokeWidth={1.5} />}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <ResultBadge result={data.result || (isPassing ? 'PASS' : 'FAIL')} />
                  </Box>
                  {(() => {
                    const isRefreshment = isForkliftRefreshment(data.assessmentType);
                    const formattedScore = isRefreshment ? Math.round(scoreNum).toString() : scoreNum.toFixed(1);
                    return (
                      <>
                        <Typography variant="h3" sx={{ fontWeight: 800, color: tokens.colors.text.primary, mt: 0.5 }}>
                          {formattedScore} / 100
                        </Typography>
                        <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                          {getAssessmentDisplayName(data.assessmentType)} · {formatDate(data.assessmentDate)}
                        </Typography>
                      </>
                    );
                  })()}
                </Box>
              </Box>

              {disqualificationReasons.length > 0 && (
                <Alert severity="error" sx={{ mb: 3, fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'inherit' }}>
                      {data.result === 'DISQUALIFIED' || manualFatalReason || isOvertime
                        ? 'Alasan Diskualifikasi:'
                        : 'Keterangan Hasil Evaluasi:'}
                    </Typography>
                    {disqualificationReasons.map((reason, idx) => (
                      <Typography key={idx} variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
                        • {reason}
                      </Typography>
                    ))}
                  </Box>
                </Alert>
              )}

              {(() => {
                const isRefreshment = isForkliftRefreshment(data.assessmentType);
                const formattedScore = isRefreshment ? Math.round(scoreNum).toString() : scoreNum.toFixed(1);
                return (
                  <Grid container spacing={2}>
                    {[
                      { label: 'Total Point', value: data.totalPoint },
                      { label: 'Total Deduction', value: `-${data.totalDeduction}`, danger: data.totalDeduction > 0 },
                      { label: 'Actual', value: data.actualPoint },
                      { label: 'Score', value: formattedScore },
                    ].map(({ label, value, danger }) => (
                      <Grid item xs={6} sm={3} key={label} className="avoid-page-break">
                        <Paper
                          sx={{
                            p: 1.5,
                            textAlign: 'center',
                            bgcolor: danger ? tokens.colors.status.dangerBg : tokens.colors.borderLight,
                            border: `1px solid ${danger ? tokens.colors.status.danger + '30' : tokens.colors.border}`,
                          }}
                        >
                          <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: danger ? tokens.colors.status.danger : tokens.colors.text.primary }}>
                            {value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>{label}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                );
              })()}
            </Paper>

            {/* Header info */}
            <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                Informasi Peserta
              </Typography>
              <Grid container spacing={1.5}>
                {(() => {
                  const isForklift = Boolean(
                    (data.vehicleType && data.vehicleType.toLowerCase().includes('forklift')) ||
                    (data.assessmentType && data.assessmentType.toLowerCase().includes('forklift')) ||
                    (data.assessmentType && (
                      data.assessmentType === 'TMMIN' ||
                      data.assessmentType === 'TMMIN_STANDARD' ||
                      data.assessmentType === 'TMMIN_REFRESHMENT'
                    )) ||
                    (data.trainingProgram && data.trainingProgram.toLowerCase().includes('forklift'))
                  );
                  const timeLimits = getAssessmentTimeLimits(data.assessmentType);
                  const totalSecs = Number(data.durationSeconds ?? data.duration ?? 0);

                  return [
                    { label: 'Nama Peserta', value: formatPersonName(data.participantName) },
                    { label: 'Program Training', value: getTrainingProgramLabel(data.trainingProgram) },
                    {
                      label: 'Durasi Total',
                      isDuration: true,
                      seconds: totalSecs,
                      limit: timeLimits.standardSeconds,
                    },
                    { label: 'Umur', value: data.age },
                    { label: 'Instruktur', value: formatPersonName(data.instructor) },
                    { label: 'Tanggal', value: formatDate(data.assessmentDate) },
                    { label: 'Lokasi Test', value: data.testLocation },
                    { label: 'Jenis Kendaraan', value: data.vehicleType },
                    { label: isForklift ? 'No. Body' : 'No. Polisi', value: formatVehicleIdentifier(data.licensePlate, isForklift) },
                    { label: 'Gol SIM', value: data.simCategory },
                    { label: 'Masa Berlaku SIM', value: data.simExpiryDate !== '-' ? data.simExpiryDate : '—' },
                    { label: 'SIO Kemnaker', value: data.sioKemnaker || '—' },
                  ];
                })().map((item) => (
                  <Grid item xs={12} sm={6} md={4} key={item.label}>
                    <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, display: 'block' }}>{item.label}</Typography>
                    {item.isDuration ? (
                      <Box sx={{ mt: 0.25 }}>
                        <InlineTimerEditor
                          initialSeconds={item.seconds}
                          timeLimitSeconds={item.limit}
                          onSave={handleSaveTotalDuration}
                          size="small"
                        />
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>{item.value || '—'}</Typography>
                    )}
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Trainer Notes */}
            <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                Catatan & Rekomendasi Instruktur
              </Typography>
              <Box sx={{ p: 2, bgcolor: tokens.colors.background, borderRadius: 1, border: `1px solid ${tokens.colors.borderLight}` }}>
                {(() => {
                  const notes = cleanTrainerNotes(data.trainerNotes || (data as any).notes);
                  return (
                    <Typography
                      variant="body1"
                      sx={{
                        color: notes ? tokens.colors.text.primary : tokens.colors.text.secondary,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {notes || '-'}
                    </Typography>
                  );
                })()}
              </Box>
            </Paper>

            {/* Sections */}
            <Paper sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                Rincian Per Seksi
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {data.sections.map((sec) => {
                  const hasDeduction = sec.totalDeduction > 0;
                  const deductedAnswers = sec.answers.filter((a) => a.deductionPoint > 0);
                  const secDuration = (data.sectionDurations?.[sec.sectionCode]) ?? sec.durationSeconds ?? 0;
                  const secLimit = getSectionTimeLimit(data.assessmentType, sec.sectionCode);

                  return (
                    <Box key={sec.id} className="avoid-page-break">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: `${tokens.borderRadius.md}px`,
                          bgcolor: hasDeduction ? tokens.colors.status.dangerBg : tokens.colors.borderLight,
                          gap: 1.5,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box sx={{ minWidth: 200, flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                            {sec.sectionName}
                            <Typography component="span" variant="caption" sx={{ ml: 1, color: tokens.colors.text.secondary }}>
                              ({sec.sectionCode})
                            </Typography>
                          </Typography>
                          {hasDeduction && (
                            <Typography variant="caption" sx={{ color: tokens.colors.status.danger, fontWeight: 600 }}>
                              Deduction: -{sec.totalDeduction}
                            </Typography>
                          )}
                        </Box>

                        {/* Inline Timer Editor for this Section */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: { xs: 0.5, sm: 0 } }}>
                          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
                            Waktu Seksi:
                          </Typography>
                          <InlineTimerEditor
                            initialSeconds={secDuration}
                            timeLimitSeconds={secLimit}
                            onSave={(newSecDuration) => handleSaveSectionDuration(sec.sectionCode, newSecDuration)}
                            size="small"
                          />
                        </Box>

                        <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, minWidth: 80, textAlign: 'right' }}>
                          {sec.actualPoint} / {sec.totalPoint}
                        </Typography>
                      </Box>

                      {deductedAnswers.length > 0 && (
                        <Box sx={{ pl: 2, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {deductedAnswers.map((ans) => (
                            <Box key={ans.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip label={ans.answer === 'NO' ? 'NO' : `${ans.answer}x`} size="small" sx={{ bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                              <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                                {ans.itemName || `Item ${ans.itemId}`}
                              </Typography>
                              <Typography variant="caption" sx={{ color: tokens.colors.status.danger, ml: 'auto', fontWeight: 600 }}>
                                -{ans.deductionPoint}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                  No. Dokumen:{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: tokens.colors.text.primary, bgcolor: tokens.colors.borderLight, px: 1, py: 0.25, borderRadius: '4px' }}>
                    {formatAuditDocNumber(data.id, data.assessmentType, data.assessmentDate)}
                  </Box>
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                  ID: {data.id} · Dibuat: {formatDate(data.createdAt)}
                </Typography>
              </Box>
            </Paper>
          </>
        )}
      </Box>

      {/* Formal A4 Print Template */}
      {data && (
        <div className="print-only">
          <AssessmentPrintTemplate data={data} />
        </div>
      )}
    </AppShell>
  );
}
