'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  Alert,
  Chip,
  Tabs,
  Tab,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  Container,
} from '@mui/material';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Timer,
  Pause,
  Play,
  Users,
  UserCheck,
} from 'lucide-react';
import PrintIcon from '@mui/icons-material/Print';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useSidebar } from '@/context/SidebarContext';
import AssessmentTypeSelector from '@/components/assessment/AssessmentTypeSelector';
import AssessmentHeader from '@/components/assessment/AssessmentHeader';
import ChecklistSection from '@/components/assessment/ChecklistSection';
import BatchAssessmentForm from '@/components/assessment/BatchAssessmentForm';
import AssessmentTimer from '@/components/assessment/AssessmentTimer';
import AssessmentProgress from '@/components/assessment/AssessmentProgress';
import AssessmentScoreSummary from '@/components/assessment/AssessmentScoreSummary';
import AssessmentReview from '@/components/assessment/AssessmentReview';
import { tokens } from '@/lib/themeTokens';
import {
  calculateDDTScore,
  initAnswerMap,
  countUnanswered,
  getTrainingProgramLabel,
} from '@/lib/assessment';
import type {
  AssessmentType,
  DDTHeaderInfo,
  AnswerMap,
  ChecklistAnswer,
} from '@/lib/assessment';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import {
  TMMIN_BASE_SCORE,
  TMMIN_CHECKLIST_DATA,
  calculateTmminOvertimePenalty,
  determineTmminResult
} from '@/features/assessment/tmmin';
import { FORKLIFT_REFRESHMENT_SECTIONS, calculateForkliftRefreshmentScore } from '@/features/assessment/forkliftRefreshment';
import { calculateAssessmentScore } from '@/features/assessment/scoringEngine';
import AssessmentPrintTemplate, { AssessmentPrintData } from '@/components/assessment/AssessmentPrintTemplate';
import ForkliftRefreshmentChecklist from '@/components/assessment/ForkliftRefreshmentChecklist';
import TmminChecklist from '@/components/assessment/TmminChecklist';
import {
  isForkliftAssessment,
  isForkliftRefreshment,
  isForkliftStandard,
  getPassingScore,
  getAssessmentDisplayName,
  formatVehicleIdentifier,
  formatPersonName,
} from '@/lib/assessment';

// ---- Wizard steps ----
type WizardStep = 'type' | 'header' | 'checklist' | 'review' | 'result';

const STEPS = ['Jenis Penilaian', 'Data Peserta', 'Penilaian', 'Review', 'Hasil'];

const EMPTY_HEADER: DDTHeaderInfo = {
  tanggal: '',
  lokasiTest: 'CCR CIBITUNG 1',
  jenisKendaraan: '',
  noPolisi: '',
  namaPeserta: '',
  umur: '',
  golSIM: '',
  masaBerlakuSIM: '',
  sioKemnaker: '',
  instruktur: '',
  trainingProgram: '',
};

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const STEP_INDEX: Record<WizardStep, number> = {
  type: 0,
  header: 1,
  checklist: 2,
  review: 3,
  result: 4,
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const { open, sidebarWidth } = useSidebar();
  // Mode state: 'single' (standard wizard) vs 'batch' (mass/multi-driver NEOP)
  const [assessmentMode, setAssessmentMode] = useState<'single' | 'batch'>('single');
  // Wizard state
  const [step, setStep] = useState<WizardStep>('type');
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [headerInfo, setHeaderInfo] = useState<DDTHeaderInfo>(EMPTY_HEADER);
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<keyof DDTHeaderInfo, string>>>({});
  const [answers, setAnswers] = useState<AnswerMap>(() => initAnswerMap(DDT_SECTIONS));
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(35 * 60); // 35 minutes
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null);

  // TMMIN state
  const [tmminFrequencies, setTmminFrequencies] = useState<Record<string, number>>({});
  const [refreshmentFrequencies, setRefreshmentFrequencies] = useState<Record<string, number>>({});
  const [tmminElapsed, setTmminElapsed] = useState(0);

  // Dynamic detection for Forklift unit across wizard steps
  const isForklift = useMemo(() => {
    return Boolean(
      isForkliftAssessment(assessmentType) ||
      (headerInfo.jenisKendaraan && headerInfo.jenisKendaraan.toLowerCase().includes('forklift')) ||
      (headerInfo.trainingProgram && headerInfo.trainingProgram.toLowerCase().includes('forklift'))
    );
  }, [assessmentType, headerInfo.jenisKendaraan, headerInfo.trainingProgram]);

  useEffect(() => {
    setCurrentSectionIndex(0);
  }, [assessmentType]);

  // Global 35-minute countdown timer for DDT (Truck) assessment only
  useEffect(() => {
    // The countdown should ONLY run if assessmentType === 'DDT' and timerRunning and timeLeft > 0
    if (assessmentType !== 'DDT' || !timerRunning || timeLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [assessmentType, timerRunning, timeLeft]);

  const sections = DDT_SECTIONS;
  const currentSection = sections[currentSectionIndex];

  // Live score using unified scoring engine
  const scoreResult = useMemo(() => {
    return calculateAssessmentScore({
      assessmentType: assessmentType || 'DDT',
      answers,
      tmminFrequencies,
      refreshmentFrequencies,
      elapsedSeconds: tmminElapsed,
    });
  }, [answers, assessmentType, tmminFrequencies, refreshmentFrequencies, tmminElapsed]);

  const handleTmminFrequencyChange = useCallback((id: string, freq: number) => {
    setTmminFrequencies((prev) => ({ ...prev, [id]: freq }));
  }, []);

  const handleRefreshmentFrequencyChange = useCallback((id: string, freq: number) => {
    const definition = FORKLIFT_REFRESHMENT_SECTIONS.flatMap((section) => section.items).find((item) => item.id === id);
    setRefreshmentFrequencies((prev) => ({ ...prev, [id]: definition ? Math.min(definition.plan, Math.max(0, freq)) : 0 }));
  }, []);

  // ---- Handlers ----

  const handleAnswerChange = useCallback((id: string, answer: ChecklistAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }));
  }, []);

  const validateHeader = (): boolean => {
    const isFork = isForkliftAssessment(assessmentType);
    const effectiveVehicle = isFork ? 'Forklift' : (headerInfo.jenisKendaraan?.trim() || 'CDD');
    const effectiveLicense = isFork
      ? (headerInfo.golSIM?.trim() || 'SIO Disnaker / Kemnaker')
      : (headerInfo.golSIM?.trim() || 'SIM B2 Umum');
    const effectiveLocation = headerInfo.lokasiTest?.trim() || 'CCR CIBITUNG 1';
    const effectiveSio = headerInfo.sioKemnaker?.trim() || (isFork ? 'Ada Terdaftar' : 'Tidak ada');

    if (!headerInfo.jenisKendaraan?.trim()) {
      setHeaderInfo((prev) => ({ ...prev, jenisKendaraan: effectiveVehicle }));
    }
    if (!headerInfo.golSIM?.trim()) {
      setHeaderInfo((prev) => ({ ...prev, golSIM: effectiveLicense }));
    }
    if (!headerInfo.lokasiTest?.trim()) {
      setHeaderInfo((prev) => ({ ...prev, lokasiTest: effectiveLocation }));
    }

    const required: (keyof DDTHeaderInfo)[] = [
      'tanggal', 'lokasiTest', 'jenisKendaraan', 'noPolisi',
      'namaPeserta', 'umur', 'golSIM', 'masaBerlakuSIM', 'instruktur', 'trainingProgram',
    ];
    const errs: Partial<Record<keyof DDTHeaderInfo, string>> = {};
    for (const field of required) {
      let val = headerInfo[field]?.trim();
      if (field === 'jenisKendaraan') val = effectiveVehicle;
      if (field === 'golSIM') val = effectiveLicense;
      if (field === 'lokasiTest') val = effectiveLocation;
      if (!val) {
        errs[field] = 'Field ini wajib diisi';
      }
    }
    setHeaderErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    setValidationError(null);
    if (step === 'type') {
      if (!assessmentType) {
        setValidationError('Pilih jenis penilaian terlebih dahulu.');
        return;
      }
      const isFork = isForkliftAssessment(assessmentType);
      setHeaderInfo((prev) => ({
        ...prev,
        lokasiTest: prev.lokasiTest || 'CCR CIBITUNG 1',
        jenisKendaraan: isFork ? 'Forklift' : (prev.jenisKendaraan && prev.jenisKendaraan !== 'Forklift' ? prev.jenisKendaraan : 'CDD'),
        golSIM: isFork
          ? 'SIO Disnaker / Kemnaker'
          : (prev.golSIM && !prev.golSIM.includes('SIO') ? prev.golSIM : 'SIM B2 Umum'),
        sioKemnaker: prev.sioKemnaker || (isFork ? 'Ada Terdaftar' : 'Tidak ada'),
      }));
      setStep('header');
    } else if (step === 'header') {
      void handleStartAssessment();
    } else if (step === 'checklist') {
      if (assessmentType === 'DDT') {
        const unanswered = countUnanswered(sections, answers);
        if (unanswered > 0) {
          setValidationError(
            `Masih ada ${unanswered} item yang belum dijawab. Anda tetap dapat melanjutkan ke Review.`,
          );
        }
      }
      setTimerRunning(false);
      setStep('review');
    } else if (step === 'review') {
      setStep('result');
    }
  };

  const handleStartAssessment = async () => {
    if (!validateHeader()) return;
    setIsSubmitting(true);
    setValidationError(null);

    const isFork = isForkliftAssessment(assessmentType);
    const effectiveHeader: DDTHeaderInfo = {
      ...headerInfo,
      namaPeserta: formatPersonName(headerInfo.namaPeserta),
      instruktur: formatPersonName(headerInfo.instruktur),
      lokasiTest: headerInfo.lokasiTest?.trim() || 'CCR CIBITUNG 1',
      jenisKendaraan: isFork ? 'Forklift' : (headerInfo.jenisKendaraan?.trim() || 'CDD'),
      golSIM: isFork
        ? (headerInfo.golSIM?.trim() || 'SIO Disnaker / Kemnaker')
        : (headerInfo.golSIM?.trim() || 'SIM B2 Umum'),
      sioKemnaker: headerInfo.sioKemnaker?.trim() || (isFork ? 'Ada Terdaftar' : 'Tidak ada'),
    };

    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentType: assessmentType === 'TMMIN' ? 'TMMIN_STANDARD' : assessmentType,
          trainingProgram: effectiveHeader.trainingProgram,
          header: effectiveHeader,
          result: 'DRAFT',
          score: 0,
          durationSeconds: 0,
          startedAt: new Date().toISOString(),
          finishedAt: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat draft asesmen baru');
      }

      // Smoothly navigate directly to the unified assessment sheet (/assessment/edit/[id])
      router.push(`/assessment/edit/${data.id}`);
    } catch (err: any) {
      console.error('Failed to create draft assessment:', err);
      setValidationError(err.message || 'Terjadi kesalahan saat memulai sesi penilaian');
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setValidationError(null);
    if (step === 'header') setStep('type');
    else if (step === 'checklist') {
      setTimerRunning(false);
      setStep('header');
    } else if (step === 'review') {
      // Return to checklist: timer stays paused. Trainer resumes when ready.
      setStep('checklist');
    } else if (step === 'result') setStep('review');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      const currentDurationSeconds = isForkliftAssessment(assessmentType)
        ? Math.max(0, tmminElapsed)
        : Math.max(0, 35 * 60 - timeLeft);
      const currentScoreResult = calculateAssessmentScore({
        assessmentType: assessmentType || 'DDT',
        answers,
        tmminFrequencies,
        refreshmentFrequencies,
        elapsedSeconds: currentDurationSeconds,
      });

      const isForklift = isForkliftAssessment(assessmentType);
      const formattedNoPolisi = headerInfo.noPolisi ? formatVehicleIdentifier(headerInfo.noPolisi, isForklift) : '';
      const sanitizedHeader = {
        ...headerInfo,
        namaPeserta: formatPersonName(headerInfo.namaPeserta),
        instruktur: formatPersonName(headerInfo.instruktur),
        noPolisi: formattedNoPolisi,
      };

      const payload = {
        assessmentType: assessmentType === 'TMMIN' ? 'TMMIN_STANDARD' : assessmentType,
        trainingProgram: sanitizedHeader.trainingProgram,
        header: sanitizedHeader,
        scoreResult: currentScoreResult,
        trainerNotes,
        duration: currentDurationSeconds,
        durationSeconds: currentDurationSeconds,
        sections: assessmentType === 'TMMIN_REFRESHMENT'
          ? FORKLIFT_REFRESHMENT_SECTIONS.map((sec) => {
              const secDeduction = sec.items.reduce((sum, item) => sum + (refreshmentFrequencies[item.id] || 0) * item.deduction, 0);
              return { sectionId: sec.code, sectionName: sec.name, totalPoint: sec.totalPoint, totalDeduction: secDeduction, actualPoint: sec.totalPoint - secDeduction, items: sec.items.filter((item) => (refreshmentFrequencies[item.id] || 0) > 0).map((item) => ({ itemId: item.id, itemName: item.label, answer: String(refreshmentFrequencies[item.id]), deductionPoint: (refreshmentFrequencies[item.id] || 0) * item.deduction })) };
            })
          : (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD')
          ? TMMIN_CHECKLIST_DATA.map((sec) => {
              const secScore = scoreResult.sectionScores?.find((s) => s.sectionId === sec.code);
              const secDeduction = secScore ? secScore.deduction : 0;
              return {
                sectionId: sec.code,
                sectionName: sec.name || sec.code,
                totalPoint: 0,
                totalDeduction: secDeduction,
                actualPoint: -secDeduction,
                items: sec.items
                  .filter((item) => (tmminFrequencies[item.id] || 0) > 0)
                  .map((item) => ({
                    itemId: item.id,
                    itemName: item.label,
                    answer: String(tmminFrequencies[item.id] || 0),
                    deductionPoint: (tmminFrequencies[item.id] || 0) * item.deduction,
                  }))
              };
            })
          : sections.map((sec) => {
              const secScore = scoreResult.sectionScores?.find((s) => s.sectionId === sec.id);
              const secDeduction = secScore ? secScore.deduction : 0;
              return {
                sectionId: sec.id,
                sectionName: sec.label || sec.id,
                totalPoint: sec.totalPoint || 0,
                totalDeduction: secDeduction,
                actualPoint: (sec.totalPoint || 0) - secDeduction,
                items: sec.items
                  .filter((item) => answers[item.id] === 'YES' || answers[item.id] === 'NO')
                  .map((item) => ({
                    itemId: item.id,
                    itemName: item.description,
                    answer: answers[item.id],
                    deductionPoint: answers[item.id] === 'NO' ? item.deductionPoint : 0,
                  }))
              };
            }),
      };

      const newAssessment = {
        id: `AS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        assessment_type: assessmentType || 'DDT',
        assessment_date: headerInfo.tanggal || new Date().toISOString(),
        participant_name: sanitizedHeader.namaPeserta,
        vehicle_type: sanitizedHeader.jenisKendaraan,
        license_plate: formattedNoPolisi,
        test_location: sanitizedHeader.lokasiTest,
        instructor: sanitizedHeader.instruktur,
        score: scoreResult.actual || scoreResult.score || 0,
        result: scoreResult.result || 'FAIL',
        trainingProgram: sanitizedHeader.trainingProgram,
        duration: currentDurationSeconds,
        durationSeconds: currentDurationSeconds,
      };

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to save assessment';
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const created = await res.json();
      setSavedAssessmentId(created.id || null);
      setStep('result');
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('type');
    setAssessmentType(null);
    setHeaderInfo(EMPTY_HEADER);
    setHeaderErrors({});
    setAnswers(initAnswerMap(DDT_SECTIONS));
    setCurrentSectionIndex(0);
    setTimerRunning(false);
    setTimeLeft(35 * 60);
    setRefreshmentFrequencies({});
    setValidationError(null);
  };

  const activeStep = STEP_INDEX[step];
  const isPassing = scoreResult.result === 'PASS';

  const printData: AssessmentPrintData | null = useMemo(() => {
    if (!assessmentType) return null;
    const isRef = isForkliftRefreshment(assessmentType);
    const isStd = isForkliftStandard(assessmentType);
    const isDdtType = assessmentType === 'DDT';
    const maxTotal = isRef ? 277 : isStd ? 134 : 100;
    const totalDed = (scoreResult as any).totalDeduction ?? (scoreResult as any).deduction ?? 0;
    const actualPt = (scoreResult as any).actual ?? (scoreResult as any).actualPoint ?? Math.max(0, maxTotal - totalDed);

    return {
      id: savedAssessmentId || undefined,
      assessmentType: assessmentType === 'TMMIN' ? 'TMMIN_STANDARD' : assessmentType,
      trainingProgram: headerInfo.trainingProgram,
      assessmentDate: headerInfo.tanggal || new Date().toISOString(),
      participantName: headerInfo.namaPeserta,
      age: headerInfo.umur,
      simCategory: headerInfo.golSIM,
      simExpiryDate: headerInfo.masaBerlakuSIM,
      sioKemnaker: headerInfo.sioKemnaker,
      vehicleType: headerInfo.jenisKendaraan,
      licensePlate: headerInfo.noPolisi ? formatVehicleIdentifier(headerInfo.noPolisi, isForkliftAssessment(assessmentType)) : '—',
      testLocation: headerInfo.lokasiTest,
      instructor: headerInfo.instruktur,
      totalPoint: maxTotal,
      totalDeduction: totalDed,
      actualPoint: actualPt,
      score: scoreResult.score,
      result: scoreResult.result,
      durationSeconds: isForkliftAssessment(assessmentType) ? tmminElapsed : (35 * 60 - timeLeft),
      trainerNotes: trainerNotes,
      frequencies: isRef ? refreshmentFrequencies : isStd ? tmminFrequencies : undefined,
      answers: isDdtType ? answers : undefined,
    };
  }, [
    savedAssessmentId,
    assessmentType,
    headerInfo,
    scoreResult,
    tmminElapsed,
    timeLeft,
    trainerNotes,
    refreshmentFrequencies,
    tmminFrequencies,
    answers,
  ]);

  // ---- Render ----
  return (
    <AppShell pageTitle="New Assessment">
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
      <Box className="hide-on-print" sx={{ maxWidth: 1200, mx: 'auto' }}>

        {/* Page title row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <ClipboardCheck size={24} color={tokens.colors.primaryLight} />
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
              New Assessment
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
              {assessmentMode === 'batch'
                ? 'Batch Assessment — Input massal peserta pelatihan (NEOP, Refreshment, Retraining)'
                : assessmentType === 'DDT'
                ? 'Truck Assessment DDT — Total 100 poin'
                : assessmentType === 'TMMIN_REFRESHMENT'
                ? 'Forklift - Refreshment — Base 277 poin'
                : assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD'
                ? 'Forklift - Standard — Base 134 poin'
                : 'Pilih jenis penilaian untuk memulai'}
            </Typography>
          </Box>
        </Box>

        {/* Toggle Mode Input: Single vs Batch */}
        <Box sx={{ mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 0.5,
              display: 'inline-flex',
              borderRadius: 2,
              bgcolor: '#f1f5f9',
              border: `1px solid ${tokens.colors.border}`,
            }}
          >
            <ToggleButtonGroup
              value={assessmentMode}
              exclusive
              onChange={(_, nextMode) => {
                if (nextMode) {
                  setAssessmentMode(nextMode);
                  setValidationError(null);
                }
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: { xs: 1.5, sm: 2.5 },
                  py: 0.9,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  border: 'none',
                  borderRadius: 1.5,
                  color: tokens.colors.text.secondary,
                  '&.Mui-selected': {
                    bgcolor: '#ffffff',
                    color: tokens.colors.primary,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    '&:hover': { bgcolor: '#ffffff' },
                  },
                },
              }}
            >
              <ToggleButton value="single">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserCheck size={17} />
                  Single Assessment
                </Box>
              </ToggleButton>
              <ToggleButton value="batch">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Users size={17} />
                  Batch Assessment (Peserta Banyak)
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>

        {/* ===== MODE BATCH: FORM BATCH & ROSTER PESERTA ===== */}
        {assessmentMode === 'batch' ? (
          <BatchAssessmentForm />
        ) : (
          <>
            {/* Stepper */}
            {step !== 'result' && (
          <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, overflow: 'hidden' }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {STEPS.map((label, idx) => (
                <Step key={label} completed={idx < activeStep}>
                  <StepLabel
                    sx={{
                      '& .MuiStepLabel-label': {
                        fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                        fontWeight: idx === activeStep ? 600 : 400,
                      },
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        )}

        {/* Validation alert */}
        {validationError && (
          <Alert
            severity="warning"
            onClose={() => setValidationError(null)}
            sx={{ mb: 2 }}
          >
            {validationError}
          </Alert>
        )}

        {/* ===== STEP: Type ===== */}
        {step === 'type' && (
          <Box>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <AssessmentTypeSelector
                selected={assessmentType}
                onSelect={(t) => {
                  setAssessmentType(t);
                  setValidationError(null);
                  const isFork = isForkliftAssessment(t);
                  const autoVehicle = isFork ? 'Forklift' : 'CDD';
                  const autoLicense = isFork ? 'SIO Disnaker / Kemnaker' : 'SIM B2 Umum';
                  setHeaderInfo((prev) => ({
                    ...prev,
                    lokasiTest: prev.lokasiTest || 'CCR CIBITUNG 1',
                    jenisKendaraan: isFork ? 'Forklift' : (prev.jenisKendaraan && prev.jenisKendaraan !== 'Forklift' ? prev.jenisKendaraan : autoVehicle),
                    golSIM: isFork
                      ? 'SIO Disnaker / Kemnaker'
                      : (prev.golSIM && !prev.golSIM.includes('SIO') ? prev.golSIM : autoLicense),
                    sioKemnaker: prev.sioKemnaker || (isFork ? 'Ada Terdaftar' : 'Tidak ada'),
                  }));
                }}
              />
            </Paper>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowRight size={18} />}
                onClick={goNext}
                disabled={!assessmentType}
                sx={{ minWidth: 160, minHeight: 52, fontWeight: 700 }}
              >
                Lanjut
              </Button>
            </Box>
          </Box>
        )}

        {/* ===== STEP: Header ===== */}
        {step === 'header' && (
          <Box>
            <AssessmentHeader
              info={headerInfo}
              onChange={setHeaderInfo}
              errors={headerErrors}
              assessmentType={assessmentType}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowLeft size={18} />}
                onClick={goBack}
                size="large"
                disabled={isSubmitting}
                sx={{ minWidth: 140, minHeight: 52 }}
              >
                Kembali
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowRight size={18} />}
                onClick={handleStartAssessment}
                size="large"
                disabled={isSubmitting}
                sx={{
                  minWidth: 180,
                  minHeight: 52,
                  fontWeight: 700,
                  bgcolor: '#059669',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#047857' },
                }}
              >
                {isSubmitting ? 'Membuat Draft Asesmen...' : 'Mulai Penilaian'}
              </Button>
            </Box>
          </Box>
        )}

        {/* ===== STEP: Checklist (DDT) ===== */}
        {step === 'checklist' && assessmentType === 'DDT' && (
          <Box sx={{ pb: '84px' }}>
            {/* Global 35-Minute Timer Banner (DDT Only) */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                borderRadius: `${tokens.borderRadius.lg}px`,
                border: `1px solid ${
                  timeLeft === 0
                    ? tokens.colors.status.danger
                    : timeLeft < 300
                    ? tokens.colors.status.warning
                    : tokens.colors.border
                }`,
                bgcolor:
                  timeLeft === 0
                    ? tokens.colors.status.dangerBg
                    : tokens.colors.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor:
                      timeLeft === 0
                        ? tokens.colors.status.dangerBg
                        : timeLeft < 300
                        ? tokens.colors.status.warningBg
                        : tokens.colors.borderLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Timer
                    size={22}
                    color={
                      timeLeft === 0
                        ? tokens.colors.status.danger
                        : timeLeft < 300
                        ? tokens.colors.status.warning
                        : tokens.colors.primaryLight
                    }
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                    Global Assessment Timer &bull; 35 Menit (DDT)
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                    Waktu ujian keseluruhan untuk seluruh 7 seksi Truck Assessment
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    color:
                      timeLeft === 0
                        ? tokens.colors.status.danger
                        : timeLeft < 300
                        ? tokens.colors.status.warning
                        : tokens.colors.text.primary,
                    lineHeight: 1,
                    letterSpacing: '0.05em',
                  }}
                >
                  {formatTimer(timeLeft)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color:
                      timeLeft === 0
                        ? tokens.colors.status.danger
                        : timeLeft < 300
                        ? tokens.colors.status.warning
                        : tokens.colors.status.success,
                  }}
                >
                  {timeLeft === 0 ? 'WAKTU HABIS' : timerRunning ? 'Berjalan' : 'Dijeda'}
                </Typography>
              </Box>
            </Paper>

            {/* Tab bar */}
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.borderRadius.lg}px`,
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={currentSectionIndex}
                onChange={(_e, v) => setCurrentSectionIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 56,
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    minHeight: 56,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    color: tokens.colors.text.secondary,
                  },
                  '& .Mui-selected': { color: tokens.colors.primaryLight },
                  '& .MuiTabs-indicator': {
                    bgcolor: tokens.colors.primaryLight,
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                {sections.map((sec, idx) => {
                  const answered = sec.items.filter((i) => answers[i.id] != null).length;
                  const total = sec.items.length;
                  const allDone = answered === total && total > 0;
                  const hasNo = sec.items.some((i) => answers[i.id] === 'NO');
                  const statusColor = hasNo
                    ? tokens.colors.status.danger
                    : allDone
                    ? tokens.colors.status.success
                    : tokens.colors.text.tertiary;
                  return (
                    <Tab
                      key={sec.id}
                      value={idx}
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, lineHeight: 1 }}>
                          <span>{sec.label}</span>
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.65rem', fontWeight: 500, color: statusColor, lineHeight: 1 }}
                          >
                            {answered}/{total} {hasNo ? '· ada NO' : allDone ? '· selesai' : '· belum selesai'}
                          </Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </Tabs>
              {/* Slim overall progress bar */}
              {(() => {
                const totalAnswered = sections.reduce((a, s) => a + s.items.filter((i) => answers[i.id] != null).length, 0);
                const totalItems = sections.reduce((a, s) => a + s.items.length, 0);
                return (
                  <LinearProgress
                    variant="determinate"
                    value={totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0}
                    sx={{
                      height: 2,
                      bgcolor: tokens.colors.borderLight,
                      '& .MuiLinearProgress-bar': { bgcolor: tokens.colors.primaryLight },
                    }}
                  />
                );
              })()}
            </Paper>

            {/* Active section content */}
            {currentSection && (
              <ChecklistSection
                section={currentSection}
                answers={answers}
                onChange={handleAnswerChange}
                assessmentType={assessmentType}
              />
            )}

            {/* Sticky footer — Full Width, Sidebar Responsive, & Overflow Protected */}
            <Box
              sx={{
                position: 'fixed',
                bottom: 0,
                left: {
                  xs: 0,
                  md: `${sidebarWidth}px`,
                },
                width: {
                  xs: '100%',
                  md: `calc(100% - ${sidebarWidth}px)`,
                },
                right: 0,
                zIndex: 1100,
                bgcolor: '#ffffff',
                borderTop: '1px solid #e5e7eb',
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
                px: { xs: 2, sm: 3 },
                py: 1.25,
                transition: 'left 0.2s ease, width 0.2s ease',
              }}
            >
              <Container
                maxWidth="xl"
                disableGutters
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  width: '100%',
                }}
              >
                {/* Left: Global 35-minute countdown timer readout (DDT only) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: { xs: 1.5, sm: 2 },
                      py: 0.75,
                      borderRadius: 2,
                      bgcolor:
                        timeLeft === 0
                          ? tokens.colors.status.dangerBg
                          : timeLeft < 300
                          ? tokens.colors.status.warningBg
                          : tokens.colors.background,
                      border: `1px solid ${
                        timeLeft === 0
                          ? tokens.colors.status.danger
                          : timeLeft < 300
                          ? tokens.colors.status.warning
                          : tokens.colors.border
                      }`,
                    }}
                  >
                    <Timer
                      size={20}
                      color={
                        timeLeft === 0
                          ? tokens.colors.status.danger
                          : timeLeft < 300
                          ? tokens.colors.status.warning
                          : tokens.colors.primaryLight
                      }
                    />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: { xs: '1.25rem', sm: '1.4rem' },
                            color:
                              timeLeft === 0
                                ? tokens.colors.status.danger
                                : timeLeft < 300
                                ? tokens.colors.status.warning
                                : tokens.colors.text.primary,
                            lineHeight: 1,
                            letterSpacing: '0.05em',
                          }}
                        >
                          {formatTimer(timeLeft)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              timeLeft === 0
                                ? tokens.colors.status.danger
                                : tokens.colors.text.secondary,
                            fontWeight: 600,
                          }}
                        >
                          {timeLeft === 0 ? 'WAKTU HABIS' : 'Sisa Waktu (35m DDT)'}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, Math.max(0, ((35 * 60 - timeLeft) / (35 * 60)) * 100))}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          mt: 0.5,
                          width: { xs: 120, sm: 160 },
                          bgcolor: tokens.colors.borderLight,
                          '& .MuiLinearProgress-bar': {
                            bgcolor:
                              timeLeft === 0
                                ? tokens.colors.status.danger
                                : timeLeft < 300
                                ? tokens.colors.status.warning
                                : tokens.colors.primaryLight,
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Right: action buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                  <Button
                    size="small"
                    onClick={() => setTimerRunning((r) => !r)}
                    startIcon={timerRunning ? <Pause size={16} /> : <Play size={16} />}
                    sx={{
                      minHeight: 40,
                      minWidth: 100,
                      px: 2,
                      py: 0.75,
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      textTransform: 'none',
                      bgcolor: timerRunning ? '#fef3c7' : '#dcfce7',
                      color: timerRunning ? '#b45309' : '#15803d',
                      border: timerRunning ? '1.5px solid #f59e0b' : '1.5px solid #16a34a',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        bgcolor: timerRunning ? '#fde68a' : '#bbf7d0',
                        borderColor: timerRunning ? '#d97706' : '#15803d',
                        boxShadow: timerRunning
                          ? '0 2px 6px rgba(245, 158, 11, 0.25)'
                          : '0 2px 6px rgba(22, 163, 74, 0.25)',
                      },
                    }}
                  >
                    {timerRunning ? 'Jeda Timer' : 'Lanjutkan Timer'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowLeft size={16} />}
                    onClick={goBack}
                    size="medium"
                    sx={{ minHeight: 40, fontWeight: 600 }}
                  >
                    Kembali
                  </Button>
                  {currentSectionIndex < sections.length - 1 ? (
                    <Button
                      variant="contained"
                      endIcon={<ArrowRight size={16} />}
                      onClick={() => setCurrentSectionIndex((i) => i + 1)}
                      size="medium"
                      sx={{ minHeight: 40, fontWeight: 700 }}
                    >
                      Seksi Berikutnya
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<ArrowRight size={16} />}
                      onClick={goNext}
                      size="medium"
                      sx={{
                        minHeight: 40,
                        fontWeight: 700,
                        bgcolor: tokens.colors.secondary,
                        '&:hover': { bgcolor: '#0e6b63' },
                      }}
                    >
                      Ke Review
                    </Button>
                  )}
                </Box>
              </Container>
            </Box>
          </Box>
        )}

        {/* ===== STEP: Checklist (TMMIN) ===== */}
        {step === 'checklist' && (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') && (
          <Box sx={{ pb: '84px' }}>
            {/* Tab bar */}
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.borderRadius.lg}px`,
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={currentSectionIndex}
                onChange={(_e, v) => setCurrentSectionIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 56,
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    minHeight: 56,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    color: tokens.colors.text.secondary,
                  },
                  '& .Mui-selected': { color: tokens.colors.primaryLight },
                  '& .MuiTabs-indicator': {
                    bgcolor: tokens.colors.primaryLight,
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                {TMMIN_CHECKLIST_DATA.map((sec, idx) => {
                  const totalFreq = sec.items.reduce((a, i) => a + (tmminFrequencies[i.id] || 0), 0);
                  const totalDeduction = sec.items.reduce((a, i) => a + (tmminFrequencies[i.id] || 0) * i.deduction, 0);
                  return (
                    <Tab
                      key={sec.code}
                      value={idx}
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, lineHeight: 1 }}>
                          <span>{sec.code}</span>
                          <Typography
                            component="span"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              lineHeight: 1,
                              color: totalDeduction > 0 ? tokens.colors.status.danger : tokens.colors.text.tertiary,
                            }}
                          >
                            {totalDeduction > 0 ? `-${totalDeduction} pts` : 'clean'}
                          </Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </Tabs>
            </Paper>

            {/* Active section content */}
            {TMMIN_CHECKLIST_DATA[currentSectionIndex] && (
              <TmminChecklist
                key={TMMIN_CHECKLIST_DATA[currentSectionIndex].code}
                section={TMMIN_CHECKLIST_DATA[currentSectionIndex]}
                frequencies={tmminFrequencies}
                onChange={handleTmminFrequencyChange}
              />
            )}

            {/* Sticky footer — sidebar-aware */}
            <Box
              sx={{
                position: 'fixed',
                bottom: 0,
                left: {
                  xs: 0,
                  md: open
                    ? `${tokens.sidebarWidth}px`
                    : `${tokens.sidebarCollapsedWidth}px`,
                },
                width: {
                  xs: '100%',
                  md: open
                    ? `calc(100% - ${tokens.sidebarWidth}px)`
                    : `calc(100% - ${tokens.sidebarCollapsedWidth}px)`,
                },
                right: 0,
                zIndex: 1100,
                bgcolor: tokens.colors.surface,
                borderTop: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
                px: { xs: 2, sm: 3 },
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'left 0.2s ease, width 0.2s ease',
              }}
            >
              {/* Left: compact timer readout */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                <AssessmentTimer
                  sectionLabel="Forklift Operation"
                  timeLimitSeconds={600}
                  running={timerRunning}
                  resetKey="tmmin"
                  onElapsedChange={setTmminElapsed}
                />
              </Box>

              {/* Right: action buttons */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Button
                  size="small"
                  onClick={() => setTimerRunning((r) => !r)}
                  startIcon={timerRunning ? <Pause size={16} /> : <Play size={16} />}
                  sx={{
                    minHeight: 40,
                    minWidth: 100,
                    px: 2,
                    py: 0.75,
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    textTransform: 'none',
                    bgcolor: timerRunning ? '#fef3c7' : '#dcfce7',
                    color: timerRunning ? '#b45309' : '#15803d',
                    border: timerRunning ? '1.5px solid #f59e0b' : '1.5px solid #16a34a',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: timerRunning ? '#fde68a' : '#bbf7d0',
                      borderColor: timerRunning ? '#d97706' : '#15803d',
                      boxShadow: timerRunning
                        ? '0 2px 6px rgba(245, 158, 11, 0.25)'
                        : '0 2px 6px rgba(22, 163, 74, 0.25)',
                    },
                  }}
                >
                  {timerRunning ? 'Jeda Timer' : 'Lanjutkan Timer'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowLeft size={16} />}
                  onClick={goBack}
                  size="medium"
                  sx={{ minHeight: 40, fontWeight: 600 }}
                >
                  Kembali
                </Button>
                {currentSectionIndex < TMMIN_CHECKLIST_DATA.length - 1 ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowRight size={16} />}
                    onClick={() => setCurrentSectionIndex((i) => i + 1)}
                    size="medium"
                    sx={{ minHeight: 40, fontWeight: 700 }}
                  >
                    Sub Job Berikutnya
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={<ArrowRight size={16} />}
                    onClick={goNext}
                    size="medium"
                    sx={{
                      minHeight: 40,
                      fontWeight: 700,
                      bgcolor: tokens.colors.secondary,
                      '&:hover': { bgcolor: '#0e6b63' },
                    }}
                  >
                    Ke Review
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* ===== STEP: Checklist (Forklift Refreshment) ===== */}
        {step === 'checklist' && assessmentType === 'TMMIN_REFRESHMENT' && (
          <Box sx={{ pb: '84px' }}>
            {/* Tab bar */}
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                border: `1px solid ${tokens.colors.border}`,
                borderRadius: `${tokens.borderRadius.lg}px`,
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={currentSectionIndex}
                onChange={(_e, v) => setCurrentSectionIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 56,
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    minHeight: 56,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    color: tokens.colors.text.secondary,
                  },
                  '& .Mui-selected': { color: tokens.colors.primaryLight },
                  '& .MuiTabs-indicator': {
                    bgcolor: tokens.colors.primaryLight,
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                {FORKLIFT_REFRESHMENT_SECTIONS.map((sec, idx) => {
                  const totalDeduction = sec.items.reduce((a, i) => a + (refreshmentFrequencies[i.id] || 0) * i.deduction, 0);
                  return (
                    <Tab
                      key={sec.code}
                      value={idx}
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, lineHeight: 1 }}>
                          <span>{sec.name}</span>
                          <Typography
                            component="span"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 500,
                              lineHeight: 1,
                              color: totalDeduction > 0 ? tokens.colors.status.danger : tokens.colors.text.tertiary,
                            }}
                          >
                            {totalDeduction > 0 ? `-${totalDeduction} pts` : 'clean'}
                          </Typography>
                        </Box>
                      }
                    />
                  );
                })}
              </Tabs>
            </Paper>

            {/* Active section content */}
            {FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex] && (
              <ForkliftRefreshmentChecklist
                key={FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex].code}
                section={FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex]}
                frequencies={refreshmentFrequencies}
                onChange={handleRefreshmentFrequencyChange}
              />
            )}

            {/* Sticky footer — sidebar-aware */}
            <Box
              sx={{
                position: 'fixed',
                bottom: 0,
                left: {
                  xs: 0,
                  md: open
                    ? `${tokens.sidebarWidth}px`
                    : `${tokens.sidebarCollapsedWidth}px`,
                },
                width: {
                  xs: '100%',
                  md: open
                    ? `calc(100% - ${tokens.sidebarWidth}px)`
                    : `calc(100% - ${tokens.sidebarCollapsedWidth}px)`,
                },
                right: 0,
                zIndex: 1100,
                bgcolor: tokens.colors.surface,
                borderTop: `1px solid ${tokens.colors.border}`,
                boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
                px: { xs: 2, sm: 3 },
                py: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                transition: 'left 0.2s ease, width 0.2s ease',
              }}
            >
              {/* Left: compact timer readout */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                <AssessmentTimer
                  sectionLabel="Forklift Operation"
                  timeLimitSeconds={600}
                  maxTimeLimitSeconds={900}
                  running={timerRunning}
                  resetKey="tmmin_refreshment"
                  onElapsedChange={setTmminElapsed}
                />
              </Box>

              {/* Right: action buttons */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                <Button
                  size="small"
                  onClick={() => setTimerRunning((r) => !r)}
                  startIcon={timerRunning ? <Pause size={16} /> : <Play size={16} />}
                  sx={{
                    minHeight: 40,
                    minWidth: 100,
                    px: 2,
                    py: 0.75,
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    textTransform: 'none',
                    bgcolor: timerRunning ? '#fef3c7' : '#dcfce7',
                    color: timerRunning ? '#b45309' : '#15803d',
                    border: timerRunning ? '1.5px solid #f59e0b' : '1.5px solid #16a34a',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      bgcolor: timerRunning ? '#fde68a' : '#bbf7d0',
                      borderColor: timerRunning ? '#d97706' : '#15803d',
                      boxShadow: timerRunning
                        ? '0 2px 6px rgba(245, 158, 11, 0.25)'
                        : '0 2px 6px rgba(22, 163, 74, 0.25)',
                    },
                  }}
                >
                  {timerRunning ? 'Jeda Timer' : 'Lanjutkan Timer'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowLeft size={16} />}
                  onClick={goBack}
                  size="medium"
                  sx={{ minHeight: 40, fontWeight: 600 }}
                >
                  Kembali
                </Button>
                {currentSectionIndex < FORKLIFT_REFRESHMENT_SECTIONS.length - 1 ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowRight size={16} />}
                    onClick={() => setCurrentSectionIndex((i) => i + 1)}
                    size="medium"
                    sx={{ minHeight: 40, fontWeight: 700 }}
                  >
                    Sub Job Berikutnya
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    endIcon={<ArrowRight size={16} />}
                    onClick={goNext}
                    size="medium"
                    sx={{
                      minHeight: 40,
                      fontWeight: 700,
                      bgcolor: tokens.colors.secondary,
                      '&:hover': { bgcolor: '#0e6b63' },
                    }}
                  >
                    Ke Review
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* ===== STEP: Review ===== */}
        {step === 'review' && (
          <Box>
            {validationError && (
              <Box sx={{ mb: 3, p: 2, bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, borderRadius: 1, border: `1px solid ${tokens.colors.status.danger}50` }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{validationError}</Typography>
              </Box>
            )}
            <AssessmentReview
              headerInfo={headerInfo}
              sections={
                isForkliftRefreshment(assessmentType)
                  ? FORKLIFT_REFRESHMENT_SECTIONS
                  : isForkliftStandard(assessmentType)
                  ? TMMIN_CHECKLIST_DATA as any
                  : sections
              }
              answers={answers}
              scoreResult={scoreResult as any}
              onBack={goBack}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              assessmentType={assessmentType as string}
              tmminFrequencies={tmminFrequencies}
              refreshmentFrequencies={refreshmentFrequencies}
              trainerNotes={trainerNotes}
              setTrainerNotes={setTrainerNotes}
            />
          </Box>
        )}

        {/* ===== STEP: Result ===== */}
        {step === 'result' && (() => {
          const isRefreshment = isForkliftRefreshment(assessmentType);
          const isStandard = isForkliftStandard(assessmentType);
          const currentScoreResult = scoreResult;
          const formattedScore = isRefreshment ? Math.round(currentScoreResult.score).toString() : currentScoreResult.score.toFixed(1);
          const passingScore = getPassingScore(assessmentType || '');
          const resultSections = isRefreshment
            ? FORKLIFT_REFRESHMENT_SECTIONS
            : isStandard
            ? TMMIN_CHECKLIST_DATA
            : sections;
          const isResultPassing = currentScoreResult.result === 'PASS';

          return (
            <Box>
              <Paper
                sx={{
                  p: { xs: 3, sm: 4 },
                  border: `2px solid ${isResultPassing ? tokens.colors.status.success : tokens.colors.status.danger}`,
                  mb: 3,
                }}
              >
                {/* Result header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  {isResultPassing ? (
                    <CheckCircle2 size={64} color={tokens.colors.status.success} strokeWidth={1.5} />
                  ) : (
                    <XCircle size={64} color={tokens.colors.status.danger} strokeWidth={1.5} />
                  )}
                  <Box
                    sx={{
                      mt: 2,
                      px: 4,
                      py: 1.5,
                      borderRadius: `${tokens.borderRadius.lg}px`,
                      bgcolor: isResultPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg,
                      display: 'inline-block',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: isResultPassing ? tokens.colors.status.success : tokens.colors.status.danger,
                        letterSpacing: '0.1em',
                      }}
                    >
                      {currentScoreResult.result}
                    </Typography>
                  </Box>
                  <Typography variant="h3" sx={{ mt: 1, color: tokens.colors.text.primary, fontWeight: 700 }}>
                    {formattedScore} / 100
                  </Typography>
                  <Typography variant="body1" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
                    {currentScoreResult.result === 'DISQUALIFIED'
                      ? 'Peserta didiskualifikasi — waktu melebihi batas maksimal (15 menit)'
                      : isResultPassing
                      ? `Peserta lulus dengan nilai di atas minimum (${passingScore})`
                      : `Peserta tidak lulus — nilai di bawah minimum (${passingScore})`}
                  </Typography>
                </Box>

                {/* Score breakdown */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                    gap: 2,
                    mb: 4,
                  }}
                >
                  {[
                    { label: 'Total Point', value: currentScoreResult.totalPoint },
                    { label: 'Total Deduction', value: `-${currentScoreResult.totalDeduction}`, danger: currentScoreResult.totalDeduction > 0 },
                    { label: 'Actual', value: currentScoreResult.actual },
                    { label: 'Score', value: formattedScore },
                  ].map(({ label, value, danger }) => (
                    <Paper
                      key={label}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: (danger as boolean) ? tokens.colors.status.dangerBg : tokens.colors.borderLight,
                        border: `1px solid ${(danger as boolean) ? tokens.colors.status.danger + '30' : tokens.colors.border}`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: (danger as boolean) ? tokens.colors.status.danger : tokens.colors.text.primary,
                        }}
                      >
                        {value}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                        {label}
                      </Typography>
                    </Paper>
                  ))}
                  {isStandard && (currentScoreResult as any).overtimePenalty > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: tokens.colors.status.dangerBg, border: `1px solid ${tokens.colors.status.danger}30` }}>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: tokens.colors.status.danger }}>
                        -{(currentScoreResult as any).overtimePenalty}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                        Overtime Penalty
                      </Typography>
                    </Paper>
                  )}
                  {isRefreshment && (currentScoreResult as any).timePenalty > 0 && (
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: tokens.colors.status.dangerBg, border: `1px solid ${tokens.colors.status.danger}30` }}>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: tokens.colors.status.danger }}>
                        -{(currentScoreResult as any).timePenalty}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary }}>
                        Time Penalty
                      </Typography>
                    </Paper>
                  )}
                </Box>

                {/* Participant info */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {(() => {
                    const isForklift = Boolean(
                      (headerInfo.jenisKendaraan && headerInfo.jenisKendaraan.toLowerCase().includes('forklift')) ||
                      (assessmentType && (
                        assessmentType === 'TMMIN' ||
                        assessmentType === 'TMMIN_STANDARD' ||
                        assessmentType === 'TMMIN_REFRESHMENT' ||
                        assessmentType.toLowerCase().includes('forklift')
                      )) ||
                      (headerInfo.trainingProgram && headerInfo.trainingProgram.toLowerCase().includes('forklift'))
                    );
                    return [
                      ['Jenis Penilaian', getAssessmentDisplayName(assessmentType)],
                      ['Program Training', getTrainingProgramLabel(headerInfo.trainingProgram)],
                      ['Nama Peserta', headerInfo.namaPeserta],
                      ['Instruktur', headerInfo.instruktur],
                      ['Tanggal', headerInfo.tanggal],
                      ['Lokasi Test', headerInfo.lokasiTest],
                      [isForklift ? 'No. Body' : 'No. Polisi', formatVehicleIdentifier(headerInfo.noPolisi, isForklift)],
                    ];
                  })().map(([label, value]) => (
                    <Box key={label}>
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, display: 'block' }}>
                        {label}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                        {value || '—'}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Section scores */}
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1.5, color: tokens.colors.text.primary }}>
                  Rincian Per Seksi
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {resultSections.map((section: any, idx: number) => {
                    const ss = currentScoreResult.sectionScores?.[idx];
                    const secDeduction = ss?.deduction ?? 0;
                    const sectionActual = isRefreshment
                      ? section.totalPoint - secDeduction
                      : isStandard
                      ? 0
                      : section.totalPoint - secDeduction;
                    return (
                      <Box
                        key={section.id || section.code}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: `${tokens.borderRadius.md}px`,
                          bgcolor: tokens.colors.borderLight,
                          gap: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500, color: tokens.colors.text.primary, flex: 1 }}>
                          {section.label || section.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {secDeduction > 0 && (
                            <Chip
                              label={`-${secDeduction}`}
                              size="small"
                              sx={{ bgcolor: tokens.colors.status.dangerBg, color: tokens.colors.status.danger, fontWeight: 700 }}
                            />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.colors.text.primary, minWidth: 60, textAlign: 'right' }}>
                            {isStandard ? `-${secDeduction}` : `${sectionActual} / ${section.totalPoint}`}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PrintIcon fontSize="small" />}
                  onClick={() => window.print()}
                  sx={{
                    minWidth: 200,
                    minHeight: 52,
                    fontWeight: 700,
                    bgcolor: tokens.colors.primary,
                    '&:hover': { bgcolor: '#0e6b63' },
                  }}
                >
                  Cetak Hard Copy / PDF
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleReset}
                  sx={{ minWidth: 180, minHeight: 52, fontWeight: 600 }}
                >
                  Mulai Penilaian Baru
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  component={Link}
                  href="/assessment/history"
                  sx={{ minWidth: 180, minHeight: 52, fontWeight: 600 }}
                >
                  Lihat Riwayat Assessment
                </Button>
              </Box>
            </Box>
          );
        })()}
          </>
        )}
      </Box>

      {/* Formal A4 Print Template */}
      {printData && (
        <div className="print-only">
          <AssessmentPrintTemplate data={printData} />
        </div>
      )}
    </AppShell>
  );
}
