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
import { ArrowLeft, History, CheckCircle2, XCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ResultBadge from '@/components/common/ResultBadge';
import { getAssessmentDisplayName } from '@/lib/assessment';
import { tokens } from '@/lib/theme';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { DDT_SECTIONS } from '@/features/assessment/ddt';

function getLabelForItemId(itemId: string, assessmentType: string): string {
  if (assessmentType === 'TMMIN') {
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
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  totalPoint: number;
  totalDeduction: number;
  actualPoint: number;
  score: string | number;
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED';
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

interface PageProps {
  params: { id: string };
}

export default function AssessmentDetailPage({ params }: PageProps) {
  const { id } = params;
  const [data, setData] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assessments/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error('Assessment tidak ditemukan');
        if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const item = json.data || json;

        let computedTotalDeduction = 0;
        let computedTotalPoint = item.totalPoint || 100;
        
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
            answers: mappedAnswers,
          };
        });

        const mappedData = {
          ...item,
          totalPoint: computedTotalPoint,
          totalDeduction: item.totalDeduction > 0 ? item.totalDeduction : computedTotalDeduction,
          actualPoint: item.actualPoint || item.score,
          sections: mappedSections,
          age: item.age || '-',
          simCategory: item.simCategory || '-',
          simIssueDate: item.simIssueDate || '-',
          simExpiryDate: item.simExpiryDate || '-',
          trainerNotes: item.trainerNotes || null,
        };
        setData(mappedData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isPassing = data?.result === 'PASS';
  const scoreNum = data ? parseFloat(String(data.score)) : 0;

  let disqualificationReasons: string[] = [];
  if (data && (data.result === 'FAIL' || data.result === 'DISQUALIFIED')) {
    let isOvertime = false;
    let hasFatal = false;
    const isForklift = data.assessmentType === 'TMMIN' || (data.assessmentType || '').toLowerCase().includes('forklift');

    if (isForklift) {
      const duration = (data as any).duration;
      if (duration !== undefined) {
        if (duration > 600) isOvertime = true;
      } else {
        const sumSectionDeductions = data.sections.reduce((acc, sec) => acc + (sec.totalDeduction || 0), 0);
        const overtimePenalty = data.totalDeduction - sumSectionDeductions;
        if (overtimePenalty >= 12) isOvertime = true;
      }
    }

    data.sections.forEach(sec => {
      sec.answers.forEach(ans => {
        if (ans.deductionPoint > 0) {
          let label = (ans.itemId || '').toLowerCase();
          if (data.assessmentType === 'TMMIN') {
            for (const tSec of TMMIN_CHECKLIST_DATA) {
              const found = tSec.items.find(i => i.id === ans.itemId);
              if (found) {
                label = found.label.toLowerCase();
                break;
              }
            }
          }
          if (
            label.includes('kontak dengan rintangan') ||
            label.includes('menabrak safety cone') ||
            label.includes('menabrak') ||
            label.includes('fatal') ||
            ans.itemId === 'S2_7'
          ) {
            hasFatal = true;
          }
        }
      });
    });

    if (isOvertime) {
      disqualificationReasons.push("Melewati batas waktu maksimal (10 Menit).");
    }
    if (hasFatal) {
      disqualificationReasons.push("Pelanggaran fatal: Menabrak rintangan/cone.");
    }
    if (disqualificationReasons.length === 0 && data.result === 'DISQUALIFIED') {
      disqualificationReasons.push("Pelanggaran fatal atau melewati batas waktu.");
    }
  }

  return (
    <AppShell pageTitle="Detail Assessment">
      <style>{`
        @media print {
          body, html {
            background-color: white !important;
          }
          nav, aside, header, .MuiDrawer-root, .hide-on-print {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .avoid-page-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>

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
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                {loading ? 'Memuat...' : (data ? data.participantName : '—')}
              </Typography>
            </Box>
          </Box>
          <Button
            className="hide-on-print"
            variant="contained"
            startIcon={<Printer size={16} />}
            size="small"
            onClick={() => window.print()}
          >
            Cetak PDF
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
                  <ResultBadge result={isPassing ? 'PASS' : 'FAIL'} />
                  {data.result === 'DISQUALIFIED' && (
                    <Chip label="DISQUALIFIED" size="small" sx={{ ml: 1, bgcolor: tokens.colors.status.warningBg, color: tokens.colors.status.warning, fontWeight: 700 }} />
                  )}
                  <Typography variant="h3" sx={{ fontWeight: 800, color: tokens.colors.text.primary, mt: 0.5 }}>
                    {scoreNum.toFixed(1)} / 100
                  </Typography>
                  <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
                    {getAssessmentDisplayName(data.assessmentType)} · {formatDate(data.assessmentDate)}
                  </Typography>
                </Box>
              </Box>

              {disqualificationReasons.length > 0 && (
                <Alert severity="error" sx={{ mb: 3, fontWeight: 600 }}>
                  Alasan Diskualifikasi: {disqualificationReasons.join(' ')}
                </Alert>
              )}

              <Grid container spacing={2}>
                {[
                  { label: 'Total Point', value: data.totalPoint },
                  { label: 'Total Deduction', value: `-${data.totalDeduction}`, danger: data.totalDeduction > 0 },
                  { label: 'Actual', value: data.actualPoint },
                  { label: 'Score', value: scoreNum.toFixed(1) },
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
            </Paper>

            {/* Header info */}
            <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                Informasi Peserta
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  ['Nama Peserta', data.participantName],
                  ['Umur', data.age],
                  ['Instruktur', data.instructor],
                  ['Tanggal', formatDate(data.assessmentDate)],
                  ['Lokasi Test', data.testLocation],
                  ['Jenis Kendaraan', data.vehicleType],
                  ['No Polisi', data.licensePlate],
                  ['Gol SIM', data.simCategory],
                  ['Masa Berlaku SIM', data.simExpiryDate !== '-' ? data.simExpiryDate : '—'],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={label}>
                    <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, display: 'block' }}>{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>{value || '—'}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Trainer Notes */}
            <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                Catatan Trainer
              </Typography>
              <Box sx={{ p: 2, bgcolor: tokens.colors.background, borderRadius: 1, border: `1px solid ${tokens.colors.borderLight}` }}>
                <Typography variant="body1" sx={{ color: data.trainerNotes ? tokens.colors.text.primary : tokens.colors.text.secondary, whiteSpace: 'pre-wrap' }}>
                  {data.trainerNotes || 'Tidak ada catatan.'}
                </Typography>
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
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Box>
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
              <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary }}>
                ID: {data.id} · Dibuat: {formatDate(data.createdAt)}
              </Typography>
            </Paper>
          </>
        )}
      </Box>
    </AppShell>
  );
}
