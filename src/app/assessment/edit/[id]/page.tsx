'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Chip,
  Tabs,
  Tab,
  TextField,
  LinearProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Save,
  Timer,
  Pause,
  Play,
  AlertCircle,
  FileText,
  UserCheck,
  CheckSquare,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useSidebar } from '@/context/SidebarContext';
import { tokens } from '@/lib/themeTokens';
import AssessmentHeader from '@/components/assessment/AssessmentHeader';
import ChecklistSection from '@/components/assessment/ChecklistSection';
import TmminChecklist from '@/components/assessment/TmminChecklist';
import ForkliftRefreshmentChecklist from '@/components/assessment/ForkliftRefreshmentChecklist';
import AssessmentTimer from '@/components/assessment/AssessmentTimer';
import InlineTimerEditor from '@/components/assessment/InlineTimerEditor';
import {
  initAnswerMap,
  countUnanswered,
  isForkliftAssessment,
  isForkliftRefreshment,
  isForkliftStandard,
  getAssessmentDisplayName,
  getPassingScore,
  formatVehicleIdentifier,
  cleanTrainerNotes,
  extractDisqualificationReason,
  formatPersonName,
} from '@/lib/assessment';
import type {
  AssessmentType,
  DDTHeaderInfo,
  AnswerMap,
  ChecklistAnswer,
} from '@/lib/assessment';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { FORKLIFT_REFRESHMENT_SECTIONS } from '@/features/assessment/forkliftRefreshment';
import {
  calculateAssessmentScore,
  getAssessmentTotalItems,
  getAssessmentAnsweredCount,
  getAssessmentTimeLimits,
} from '@/features/assessment/scoringEngine';

type StoredAnswer = {
  id: string;
  itemId: string;
  itemName?: string | null;
  answer: string;
  deductionPoint: number;
};

type StoredSection = {
  id: string;
  sectionCode: string;
  sectionName?: string | null;
  totalPoint: number;
  totalDeduction: number;
  actualPoint: number;
  answers: StoredAnswer[];
};

type AssessmentData = {
  id: string;
  assessmentType: string;
  assessmentDate: string;
  createdAt: string;
  durationSeconds: number | null;
  participantName: string;
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  trainingProgram?: string | null;
  age?: string | null;
  simCategory?: string | null;
  simExpiryDate?: string | null;
  score: number;
  result: string;
  totalPoint?: number | null;
  totalDeduction?: number | null;
  actualPoint?: number | null;
  trainerNotes?: string | null;
  sections?: StoredSection[];
};

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

const FATAL_DISQUALIFICATION_PRESETS = [
  'Menabrak rintangan / cone / obstacle',
  'Pelanggaran prosedur Safety / K3 fatal',
  'Barang / pallet jatuh saat manuver',
  'Menyenggol fasilitas / unit lain',
  'Human error / alasan lainnya',
] as const;

function formatDate(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '00:00 (0 menit 0 detik)';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (${m} menit ${s} detik)`;
}

function formatStopwatch(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface BatchParticipantItem {
  id: string;
  name: string;
  unit?: string;
}

interface BatchSessionData {
  batchId?: string;
  program?: string;
  items: BatchParticipantItem[];
}

export default function EditAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sidebarOpen, sidebarWidth } = useSidebar();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Batch assessment queue state
  const [batchSession, setBatchSession] = useState<BatchSessionData | null>(null);

  // Core assessment state
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('DDT');
  const [headerInfo, setHeaderInfo] = useState<DDTHeaderInfo>(EMPTY_HEADER);
  const [headerErrors, setHeaderErrors] = useState<Partial<Record<keyof DDTHeaderInfo, string>>>({});
  const [trainerNotes, setTrainerNotes] = useState('');

  // Disqualification (Fatal Error / Human Error) state
  const [isFatalDisqualified, setIsFatalDisqualified] = useState(false);
  const [selectedFatalReason, setSelectedFatalReason] = useState<string>('Menabrak rintangan / cone / obstacle');
  const [customFatalReason, setCustomFatalReason] = useState<string>('');

  const effectiveFatalReason = useMemo(() => {
    if (!isFatalDisqualified) return '';
    if (selectedFatalReason === 'Human error / alasan lainnya') {
      return customFatalReason.trim() || 'Human error / Pelanggaran fatal';
    }
    return selectedFatalReason;
  }, [isFatalDisqualified, selectedFatalReason, customFatalReason]);

  // Frozen duration & original timestamp from database
  const [originalDurationSeconds, setOriginalDurationSeconds] = useState(0);
  // Real-time stopwatch duration (in seconds)
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Tab state: 0 = Checklist, 1 = Header Peserta, 2 = Catatan & Ringkasan
  const [activeMainTab, setActiveMainTab] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Answers state for each assessment type
  const [answers, setAnswers] = useState<AnswerMap>(() => initAnswerMap(DDT_SECTIONS));
  const [tmminFrequencies, setTmminFrequencies] = useState<Record<string, number>>({});
  const [refreshmentFrequencies, setRefreshmentFrequencies] = useState<Record<string, number>>({});

  // Count answered items and total items using unified scoring engine
  const answeredCount = useMemo(() => {
    return getAssessmentAnsweredCount({
      assessmentType,
      answers,
      tmminFrequencies,
      refreshmentFrequencies,
    });
  }, [assessmentType, answers, tmminFrequencies, refreshmentFrequencies]);

  const totalItemsCount = useMemo(() => {
    return getAssessmentTotalItems(assessmentType);
  }, [assessmentType]);

  // Assessment has started filling strictly when at least 1 item is answered
  const hasStartedFilling = answeredCount > 0;
  const isEvaluated = answeredCount > 0 || durationSeconds > 5;

  // Time limits configuration from unified engine
  const timeLimits = useMemo(() => {
    return getAssessmentTimeLimits(assessmentType);
  }, [assessmentType]);

  // FROZEN TIMER is strictly active ONLY if finalized/completed or in explicit read-only view
  const isReadOnlyView = searchParams.get('readOnly') === 'true' || searchParams.get('view') === '1';
  const isAssessmentCompleted =
    Boolean((assessment as any)?.finishedAt) ||
    Boolean(
      assessment?.result &&
      ['COMPLETED', 'PASS', 'FAIL', 'DISQUALIFIED'].includes(assessment.result.toUpperCase())
    );
  const isFrozen = Boolean(isReadOnlyView || isAssessmentCompleted);

  // Timer running state (paused / running)
  const [timerRunning, setTimerRunning] = useState<boolean>(true);

  // Sync elapsed timer changes from AssessmentTimer
  const handleElapsedChange = useCallback((sec: number) => {
    setDurationSeconds(sec);
  }, []);

  // Detect Batch Session from sessionStorage or URL query params
  useEffect(() => {
    const isBatchQuery = searchParams.get('batch') === '1';
    const batchIdsParam = searchParams.get('batchIds');

    let parsedSession: BatchSessionData | null = null;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('slec_batch_session');
        if (stored) {
          parsedSession = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Failed to parse batch session from storage:', e);
    }

    if (parsedSession && Array.isArray(parsedSession.items) && parsedSession.items.length > 0) {
      setBatchSession(parsedSession);
    } else if (isBatchQuery && batchIdsParam) {
      const ids = batchIdsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        setBatchSession({
          program: 'NEOP',
          items: ids.map((itemId, idx) => ({
            id: itemId,
            name: itemId === id ? (headerInfo.namaPeserta || `Peserta #${idx + 1}`) : `Peserta #${idx + 1}`,
          })),
        });
      }
    }
  }, [id, searchParams]);

  // Sync current assessment participant name into batchSession roster if available
  useEffect(() => {
    if (assessment?.participantName && id) {
      setBatchSession((prev) => {
        if (!prev) return prev;
        const idx = prev.items.findIndex((it) => it.id === id);
        if (idx !== -1 && prev.items[idx].name !== assessment.participantName) {
          const updated = [...prev.items];
          updated[idx] = {
            ...updated[idx],
            name: assessment.participantName,
            unit: assessment.licensePlate || updated[idx].unit,
          };
          const nextSession = { ...prev, items: updated };
          try {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('slec_batch_session', JSON.stringify(nextSession));
            }
          } catch (e) {
            console.warn('Failed to update batch session in sessionStorage:', e);
          }
          return nextSession;
        }
        return prev;
      });
    }
  }, [assessment, id]);

  // Derived batch state
  const isBatchMode = Boolean(
    batchSession &&
      batchSession.items.length > 0 &&
      batchSession.items.some((it) => it.id === id)
  );
  const currentBatchIndex = isBatchMode && batchSession ? batchSession.items.findIndex((it) => it.id === id) : -1;
  const totalBatchCount = isBatchMode && batchSession ? batchSession.items.length : 0;
  const prevParticipantId =
    isBatchMode && batchSession && currentBatchIndex > 0 ? batchSession.items[currentBatchIndex - 1].id : null;
  const nextParticipantId =
    isBatchMode && batchSession && currentBatchIndex >= 0 && currentBatchIndex < batchSession.items.length - 1
      ? batchSession.items[currentBatchIndex + 1].id
      : null;

  // Dynamic detection for Forklift unit
  const isForklift = Boolean(
    isForkliftAssessment(assessmentType) ||
    (headerInfo.jenisKendaraan && headerInfo.jenisKendaraan.toLowerCase().includes('forklift')) ||
    (assessment?.vehicleType && assessment.vehicleType.toLowerCase().includes('forklift')) ||
    (headerInfo.trainingProgram && headerInfo.trainingProgram.toLowerCase().includes('forklift'))
  );

  // Fetch assessment by ID on mount
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setFetchError(null);

    fetch(`/api/assessments/${id}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat data assessment');

        setAssessment(data as AssessmentData);

        const aType = (data.assessmentType as AssessmentType) || 'DDT';
        setAssessmentType(aType);

        const sioMatch = (data.trainerNotes || '').match(/\[SIO Kemnaker:\s*([^\]]+)\]/);
        const sioExtracted = sioMatch ? sioMatch[1].trim() : '';

        const autoVehicle = isForkliftAssessment(data.assessmentType) ? 'Forklift' : 'CDD';
        // Header info mapping
        const initialHeader: DDTHeaderInfo = {
          tanggal: data.assessmentDate ? data.assessmentDate.split('T')[0] : '',
          lokasiTest: data.testLocation || 'CCR CIBITUNG 1',
          jenisKendaraan: data.vehicleType || autoVehicle,
          noPolisi: data.licensePlate || '',
          namaPeserta: data.participantName || '',
          umur: data.age || '',
          golSIM: data.simCategory || '',
          masaBerlakuSIM: data.simExpiryDate ? data.simExpiryDate.split('T')[0] : '',
          sioKemnaker: (data as any).sioKemnaker || sioExtracted || '',
          instruktur: data.instructor || '',
          trainingProgram: (data.trainingProgram as any) || '',
        };
        setHeaderInfo(initialHeader);
        const cleanNotes = cleanTrainerNotes(data.trainerNotes);
        setTrainerNotes(cleanNotes);

        // Restore manual fatal disqualification if previously saved
        const fatalReason = extractDisqualificationReason(data.trainerNotes);
        if (fatalReason) {
          setIsFatalDisqualified(true);
          const presets = [
            'Menabrak rintangan / cone / obstacle',
            'Pelanggaran prosedur Safety / K3 fatal',
            'Barang / pallet jatuh saat manuver',
            'Menyenggol fasilitas / unit lain',
          ];
          if (presets.includes(fatalReason)) {
            setSelectedFatalReason(fatalReason);
            setCustomFatalReason('');
          } else {
            setSelectedFatalReason('Human error / alasan lainnya');
            setCustomFatalReason(fatalReason);
          }
        }

        // Initial duration from database
        const initialDuration = Number(data.durationSeconds) || 0;
        setOriginalDurationSeconds(initialDuration);
        setDurationSeconds(initialDuration);

        // Restore answers / frequencies from database
        const restoredAnswers = initAnswerMap(DDT_SECTIONS);
        const restoredTmminFreqs: Record<string, number> = {};
        const restoredRefreshmentFreqs: Record<string, number> = {};

        if (Array.isArray(data.sections)) {
          for (const sec of data.sections) {
            if (Array.isArray(sec.answers)) {
              for (const ans of sec.answers) {
                if (!ans.itemId) continue;
                if (ans.answer === 'YES' || ans.answer === 'NO') {
                  restoredAnswers[ans.itemId] = ans.answer;
                } else if (ans.answer === '' || ans.answer === null || ans.answer === undefined || ans.answer === 'UNKNOWN') {
                  restoredAnswers[ans.itemId] = null;
                } else {
                  const str = String(ans.answer).trim();
                  if (str !== '') {
                    const num = Number(str);
                    if (!Number.isNaN(num)) {
                      restoredTmminFreqs[ans.itemId] = num;
                      restoredRefreshmentFreqs[ans.itemId] = num;
                    }
                  }
                }
              }
            }
          }
        }

        setAnswers(restoredAnswers);
        setTmminFrequencies(restoredTmminFreqs);
        setRefreshmentFrequencies(restoredRefreshmentFreqs);
      })
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Answer change handlers
  const handleAnswerChange = useCallback((itemId: string, answer: ChecklistAnswer) => {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }));
  }, []);

  const handleTmminFrequencyChange = useCallback((itemId: string, freq: number) => {
    setTmminFrequencies((prev) => ({ ...prev, [itemId]: Math.max(0, freq) }));
  }, []);

  const handleRefreshmentFrequencyChange = useCallback((itemId: string, freq: number) => {
    const definition = FORKLIFT_REFRESHMENT_SECTIONS.flatMap((sec) => sec.items).find((item) => item.id === itemId);
    setRefreshmentFrequencies((prev) => ({
      ...prev,
      [itemId]: definition ? Math.min(definition.plan, Math.max(0, freq)) : Math.max(0, freq),
    }));
  }, []);

  // Automatic Score Calculation using Unified Engine (Uses durationSeconds for live overtime/penalty calculations)
  const scoreResult = useMemo(() => {
    return calculateAssessmentScore({
      assessmentType,
      answers,
      tmminFrequencies,
      refreshmentFrequencies,
      elapsedSeconds: durationSeconds,
    });
  }, [assessmentType, refreshmentFrequencies, tmminFrequencies, answers, durationSeconds]);

  // Validation
  const validateHeader = (): boolean => {
    const autoVehicle = isForklift ? 'Forklift' : 'Truk';
    const effectiveVehicle = headerInfo.jenisKendaraan?.trim() || autoVehicle;

    if (!headerInfo.jenisKendaraan?.trim()) {
      setHeaderInfo((prev) => ({ ...prev, jenisKendaraan: effectiveVehicle }));
    }

    const required: (keyof DDTHeaderInfo)[] = [
      'tanggal',
      'lokasiTest',
      'jenisKendaraan',
      'noPolisi',
      'namaPeserta',
      'umur',
      'golSIM',
      'masaBerlakuSIM',
      'sioKemnaker',
      'instruktur',
      'trainingProgram',
    ];
    const errs: Partial<Record<keyof DDTHeaderInfo, string>> = {};
    for (const field of required) {
      const val = field === 'jenisKendaraan' ? effectiveVehicle : headerInfo[field]?.trim();
      if (!val) {
        errs[field] = 'Field ini wajib diisi';
      }
    }
    setHeaderErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle manual editing of elapsed time (via pencil icon / InlineTimerEditor)
  const handleDurationEdit = async (newTotal: number) => {
    // 1. Immediately update local duration state so React re-calculates scoreResult in real-time
    setDurationSeconds(newTotal);
    setOriginalDurationSeconds(newTotal);
    setTimerRunning(false);

    // 2. Pre-calculate updated score and result with new duration
    const currentScoreResult = calculateAssessmentScore({
      assessmentType,
      answers,
      tmminFrequencies,
      refreshmentFrequencies,
      elapsedSeconds: newTotal,
    });

    const isComplete = Boolean(isAssessmentCompleted);
    const computedResult = isComplete
      ? (isFatalDisqualified ? 'FAIL' : (currentScoreResult.result || assessment?.result || 'PASS'))
      : (hasStartedFilling ? 'IN_PROGRESS' : 'DRAFT');

    // 3. Persist immediately via PATCH to /api/assessments/${id}
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: newTotal,
          score: currentScoreResult.score,
          result: computedResult,
          totalDeduction: currentScoreResult.totalDeduction,
          actualPoint: currentScoreResult.actual,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memperbarui durasi asesmen');
      }
      router.refresh();
    } catch (e) {
      console.warn('Failed to auto-patch duration:', e);
      throw e;
    }
  };

  // Submit Handler: Saves updated header, answers, calculated score WITHOUT touching createdAt or durationSeconds
  const handleSave = async (forceComplete: boolean = false): Promise<boolean> => {
    if (!assessment) return false;
    if (!validateHeader()) {
      setActiveMainTab(1); // Switch to header tab to show error
      setFormError('Mohon periksa kembali kelengkapan Data Peserta pada tab Informasi Peserta.');
      return false;
    }

    setSaving(true);
    setFormError(null);
    setSavedSuccess(false);

    try {
      const sectionsPayload =
        assessmentType === 'TMMIN_REFRESHMENT'
          ? FORKLIFT_REFRESHMENT_SECTIONS.map((sec) => {
              const secDeduction = sec.items.reduce(
                (sum, item) => sum + (refreshmentFrequencies[item.id] || 0) * item.deduction,
                0,
              );
              return {
                sectionId: sec.code,
                sectionName: sec.name,
                totalPoint: sec.totalPoint,
                totalDeduction: secDeduction,
                actualPoint: sec.totalPoint - secDeduction,
                items: sec.items
                  .filter((item) => (refreshmentFrequencies[item.id] || 0) > 0)
                  .map((item) => ({
                    itemId: item.id,
                    itemName: item.label,
                    answer: String(refreshmentFrequencies[item.id]),
                    deductionPoint: (refreshmentFrequencies[item.id] || 0) * item.deduction,
                  })),
              };
            })
          : assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD'
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
                  })),
              };
            })
          : DDT_SECTIONS.map((sec) => {
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
                  })),
              };
            });

      const isComplete = forceComplete || Boolean(isAssessmentCompleted);
      const computedResult = isComplete
        ? (isFatalDisqualified ? 'FAIL' : (scoreResult.result || assessment?.result || 'PASS'))
        : (hasStartedFilling ? 'IN_PROGRESS' : 'DRAFT');
      const finishedTimestamp = isComplete
        ? ((assessment as any)?.finishedAt || new Date().toISOString())
        : null;
      const finalScore = isComplete ? scoreResult.score : (hasStartedFilling ? scoreResult.score : 0);
      const finalActualPoint = isComplete ? scoreResult.actual : (hasStartedFilling ? scoreResult.actual : 0);
      const finalDurationSeconds = durationSeconds;

      const pureNotes = trainerNotes.trim();
      const fatalTag = isFatalDisqualified && effectiveFatalReason
        ? `[FatalError: ${effectiveFatalReason}]`
        : '';
      let payloadNotes: string | null = null;

      if (isComplete) {
        // Saat klik "Selesaikan & Submit Penilaian", simpan murni teks catatan trainer plus tag fatal error jika didiskualifikasi
        const parts = [pureNotes, fatalTag].filter(Boolean);
        payloadNotes = parts.length > 0 ? parts.join('\n') : null;
      } else {
        // Saat klik "Simpan Draft", gabungkan metadata secara tersembunyi di dalam payload API
        const existingNotes = assessment?.trainerNotes || '';
        const startedMatch = existingNotes.match(/\[StartedAt:\s*([^\]]+)\]/);
        const startedTag = startedMatch
          ? `[StartedAt: ${startedMatch[1].trim()}]`
          : `[StartedAt: ${new Date().toISOString()}]`;
        const statusTag = `[Status: ${computedResult}]`;

        const metaTags = [startedTag, statusTag, fatalTag].filter(Boolean).join('\n');
        payloadNotes = pureNotes ? `${pureNotes}\n${metaTags}` : metaTags;
      }

      const formattedNoPolisi = headerInfo.noPolisi ? formatVehicleIdentifier(headerInfo.noPolisi, isForklift) : '';
      const sanitizedHeader = {
        ...headerInfo,
        namaPeserta: formatPersonName(headerInfo.namaPeserta),
        instruktur: formatPersonName(headerInfo.instruktur),
        noPolisi: formattedNoPolisi,
      };

      const payload = {
        header: sanitizedHeader,
        score: finalScore,
        result: computedResult,
        scoreResult: {
          ...scoreResult,
          result: computedResult,
        },
        totalPoint: scoreResult.totalPoint,
        totalDeduction: scoreResult.totalDeduction,
        actualPoint: finalActualPoint,
        trainerNotes: payloadNotes,
        durationSeconds: finalDurationSeconds,
        finishedAt: finishedTimestamp,
        sections: sectionsPayload,
      };

      const res = await fetch(`/api/assessments/${assessment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pembaruan asesmen');

      setSavedSuccess(true);
      setAssessment((prev) =>
        prev
          ? {
              ...prev,
              score: finalScore,
              result: computedResult,
              durationSeconds: finalDurationSeconds,
              finishedAt: finishedTimestamp,
              trainerNotes: payloadNotes,
              participantName: sanitizedHeader.namaPeserta,
              vehicleType: sanitizedHeader.jenisKendaraan,
              licensePlate: formattedNoPolisi,
              testLocation: sanitizedHeader.lokasiTest,
              instructor: sanitizedHeader.instruktur,
            }
          : prev,
      );
      router.refresh();
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan perubahan');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Submit Draft: keeps status IN_PROGRESS or DRAFT, no redirect
  const handleSaveDraft = async () => {
    await handleSave(false);
  };

  // Finalize & Submit: sets status to definitive PASS/FAIL/DISQUALIFIED, finishedAt = now, redirects to /assessment/history
  const handleFinalizeAndSubmit = async () => {
    const ok = await handleSave(true);
    if (ok) {
      router.push('/assessment/history');
    }
  };

  // Batch Session Queue Navigation
  const handleSaveAndNavigate = async (targetId: string, finalizeCurrent: boolean = true) => {
    if (!targetId || targetId === id) return;
    const ok = await handleSave(finalizeCurrent && isEvaluated);
    if (ok) {
      const batchIdsParam =
        batchSession?.items.map((it) => it.id).join(',') || searchParams.get('batchIds') || '';
      router.push(`/assessment/edit/${targetId}?batch=1&batchIds=${batchIdsParam}`);
    }
  };

  const handleSaveAndFinishBatch = async () => {
    const ok = await handleSave(true);
    if (ok) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('slec_batch_session');
        }
      } catch (e) {
        console.warn('Failed to clear batch session:', e);
      }
      router.push('/assessment/history');
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Edit Assessment">
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <LinearProgress sx={{ width: '100%', maxWidth: 400, borderRadius: 2 }} />
          <Typography sx={{ color: tokens.colors.text.secondary }}>
            Memuat data asesmen dan checklist penilaian...
          </Typography>
        </Box>
      </AppShell>
    );
  }

  if (fetchError || !assessment) {
    return (
      <AppShell pageTitle="Edit Assessment">
        <Box sx={{ p: 4 }}>
          <Alert severity="error">{fetchError || 'Assessment tidak ditemukan.'}</Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={18} />}
            onClick={() => router.push('/assessment/history')}
            sx={{ mt: 2 }}
          >
            Kembali ke History
          </Button>
        </Box>
      </AppShell>
    );
  }

  const isDdt = assessmentType === 'DDT';
  const isTmminStd = assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD';
  const isRef = assessmentType === 'TMMIN_REFRESHMENT';
  const passingScore = getPassingScore(assessmentType);
  const isPassing = !isFatalDisqualified && scoreResult.result === 'PASS';

  return (
    <AppShell pageTitle="Edit Assessment">
      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 10 }}>
        {/* Header Bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
              Edit Assessment &bull; {getAssessmentDisplayName(assessmentType)}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
              Peserta: <strong className="capitalize">{formatPersonName(headerInfo.namaPeserta || assessment.participantName)}</strong> &bull; {isForklift ? 'No. Body' : 'No. Polisi'}:{' '}
              {formatVehicleIdentifier(headerInfo.noPolisi || assessment.licensePlate, isForklift)}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={18} />}
            onClick={() => router.push('/assessment/history')}
            sx={{ minHeight: 44, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Kembali ke History
          </Button>
        </Box>

        {/* Active Stopwatch vs Immutable Audit Frozen Timer Banner */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: `${tokens.borderRadius.lg}px`,
            border: isFrozen
              ? `1px solid ${tokens.colors.border}`
              : `1.5px solid ${tokens.colors.primaryLight}`,
            bgcolor: isFrozen ? tokens.colors.surface : 'rgba(59, 130, 246, 0.03)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.25 }}>
              {isFrozen ? (
                <>
                  <LockKeyhole size={20} color={tokens.colors.status.success} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                    Audit Integrity &bull; Timer Asli Terkunci (Read-Only)
                  </Typography>
                  <Chip
                    label="FROZEN TIMER"
                    size="small"
                    sx={{
                      bgcolor: tokens.colors.status.successBg,
                      color: tokens.colors.status.success,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                </>
              ) : (
                <>
                  <Timer size={20} color={tokens.colors.primaryLight} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
                    Sesi Penilaian Aktif &bull; Stopwatch Real-Time
                  </Typography>
                  <Chip
                    label={timerRunning ? 'LIVE STOPWATCH' : 'DIJEDA (PAUSED)'}
                    size="small"
                    sx={{
                      bgcolor: timerRunning ? 'rgba(59, 130, 246, 0.12)' : '#fef3c7',
                      color: timerRunning ? tokens.colors.primaryLight : '#b45309',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      height: 26,
                      border: `1px solid ${timerRunning ? 'rgba(59, 130, 246, 0.4)' : '#f59e0b'}`,
                    }}
                  />
                  <Button
                    size="small"
                    onClick={() => setTimerRunning((prev) => !prev)}
                    startIcon={timerRunning ? <Pause size={16} /> : <Play size={16} />}
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      textTransform: 'none',
                      minHeight: 36,
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
                </>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary, fontWeight: 600 }}>
              ID: {assessment.id}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              p: 2,
              bgcolor: isFrozen ? tokens.colors.background : tokens.colors.surface,
              borderRadius: `${tokens.borderRadius.md}px`,
              border: `1px solid ${tokens.colors.borderLight}`,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.text.tertiary, fontWeight: 600 }}>
                {isFrozen ? 'Durasi Pengerjaan Asli' : 'Stopwatch Berjalan'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                <Timer size={16} color={isFrozen ? tokens.colors.status.info : tokens.colors.primaryLight} />
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: isFrozen ? tokens.colors.text.primary : tokens.colors.primaryLight,
                    fontSize: '1.05rem',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatStopwatch(durationSeconds)}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary, fontWeight: 600 }}>
                  ({Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s)
                </Typography>
                <InlineTimerEditor
                  initialSeconds={durationSeconds}
                  timeLimitSeconds={timeLimits.standardSeconds}
                  showStatusBadge={false}
                  onSave={handleDurationEdit}
                  size="small"
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.text.tertiary, fontWeight: 600 }}>
                {isFrozen ? 'Waktu Mulai Asli' : 'Waktu Mulai Sesi'}
              </Typography>
              <Typography sx={{ fontWeight: 600, color: tokens.colors.text.primary, fontSize: '0.9rem', mt: 0.25 }}>
                {formatDate((assessment as any)?.startedAt || assessment.createdAt)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.text.tertiary, fontWeight: 600 }}>
                Tanggal Asesmen
              </Typography>
              <Typography sx={{ fontWeight: 600, color: tokens.colors.text.primary, fontSize: '0.9rem', mt: 0.25 }}>
                {formatDate(assessment.assessmentDate)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ display: 'block', color: tokens.colors.text.tertiary, fontWeight: 600 }}>
                {isFrozen ? 'Skor Kalkulasi Otomatis' : 'Skor Sementara'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: hasStartedFilling
                      ? (isPassing ? tokens.colors.status.success : tokens.colors.status.danger)
                      : tokens.colors.text.secondary,
                  }}
                >
                  {hasStartedFilling ? `${scoreResult.score.toFixed(1)} / 100` : '— / 100'}
                </Typography>
                <Chip
                  label={hasStartedFilling ? (isFatalDisqualified ? 'FAIL (DISKUALIFIKASI)' : scoreResult.result) : 'Belum Dinilai'}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    height: 20,
                    bgcolor: hasStartedFilling
                      ? (isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg)
                      : tokens.colors.borderLight,
                    color: hasStartedFilling
                      ? (isPassing ? tokens.colors.status.success : tokens.colors.status.danger)
                      : tokens.colors.text.secondary,
                  }}
                />
                {Boolean(scoreResult.timePenalty || scoreResult.overtimePenalty) && (
                  <Chip
                    label={`Penalti Waktu: -${scoreResult.timePenalty || scoreResult.overtimePenalty} pts`}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      height: 20,
                      bgcolor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Unified Assessment Timer (DRY with Single Assessment) */}
          <Box sx={{ mt: 2 }}>
            <AssessmentTimer
              assessmentId={String(id)}
              sectionLabel={timeLimits.label}
              timeLimitSeconds={timeLimits.standardSeconds}
              maxTimeLimitSeconds={timeLimits.maxSeconds}
              running={timerRunning && !isFrozen}
              resetKey={`${id}_${originalDurationSeconds}`}
              initialSeconds={durationSeconds}
              onElapsedChange={handleElapsedChange}
              allowEdit={true}
              onSaveDuration={handleDurationEdit}
              isFrozen={isFrozen}
              finishedAt={(assessment as any)?.finishedAt}
              status={assessment?.result}
            />
          </Box>
        </Paper>

        {/* Notifications */}
        {formError && (
          <Alert severity="error" onClose={() => setFormError(null)} sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        {savedSuccess && (
          <Alert
            severity="success"
            icon={<CheckCircle2 size={20} />}
            onClose={() => setSavedSuccess(false)}
            sx={{ mb: 2 }}
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  color="inherit"
                  size="small"
                  variant="outlined"
                  onClick={() => router.push('/assessment/history')}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', borderColor: 'currentColor', textTransform: 'none' }}
                >
                  Kembali ke History
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setSavedSuccess(false)}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  Lanjut Menilai
                </Button>
              </Box>
            }
          >
            Draft berhasil disimpan! Akumulasi detik timer dan jawaban checklist tersimpan dengan aman ke database.
          </Alert>
        )}

        {/* Batch Participant Switcher Queue Bar */}
        {isBatchMode && batchSession && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.25 },
              mb: 2.5,
              borderRadius: `${tokens.borderRadius.lg}px`,
              border: '1.5px solid #0d9488',
              bgcolor: '#f0fdfa',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            {/* Left info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  bgcolor: '#ccfbf1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f766e',
                  flexShrink: 0,
                }}
              >
                <Users size={22} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f766e', letterSpacing: 0.5 }}>
                    SESI BATCH ASESMEN ({batchSession.program || 'NEOP'})
                  </Typography>
                  <Chip
                    label={`Peserta ${currentBatchIndex + 1} dari ${totalBatchCount}`}
                    size="small"
                    sx={{
                      bgcolor: '#0d9488',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 22,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#115e59', mt: 0.25 }}>
                  Sedang menilai: <strong className="capitalize">{formatPersonName(headerInfo.namaPeserta || assessment.participantName)}</strong>
                  {headerInfo.noPolisi ? ` • ${isForklift ? 'No. Body' : 'No. Polisi'}: ${formatVehicleIdentifier(headerInfo.noPolisi, isForklift)}` : ''}
                </Typography>
              </Box>
            </Box>

            {/* Center / Right controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Switcher Dropdown */}
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 250 } }}>
                <InputLabel id="batch-switcher-label" sx={{ color: '#0f766e', fontWeight: 600 }}>
                  Pindah Peserta Sesi
                </InputLabel>
                <Select
                  labelId="batch-switcher-label"
                  value={id}
                  label="Pindah Peserta Sesi"
                  onChange={(e) => handleSaveAndNavigate(e.target.value as string, isEvaluated)}
                  sx={{
                    bgcolor: '#ffffff',
                    borderRadius: `${tokens.borderRadius.md}px`,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#99f6e4',
                    },
                  }}
                >
                  {batchSession.items.map((item, idx) => (
                    <MenuItem key={item.id} value={item.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1.5 }}>
                        <span>
                          <strong>{idx + 1}.</strong> {item.name || `Peserta #${idx + 1}`}
                        </span>
                        {item.unit && item.unit !== '-' && (
                          <Chip
                            label={item.unit}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f3f4f6' }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Quick Prev / Next Buttons */}
              <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!prevParticipantId || saving}
                  onClick={() => prevParticipantId && handleSaveAndNavigate(prevParticipantId, false)}
                  startIcon={<ChevronLeft size={16} />}
                  sx={{
                    flex: { xs: 1, sm: 'none' },
                    borderColor: '#99f6e4',
                    color: '#0f766e',
                    fontWeight: 700,
                    minHeight: 40,
                    bgcolor: '#ffffff',
                    '&:hover': {
                      borderColor: '#0d9488',
                      bgcolor: '#e6fffa',
                    },
                    '&.Mui-disabled': {
                      borderColor: '#e5e7eb',
                    },
                  }}
                >
                  Prev
                </Button>

                {nextParticipantId && (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={saving}
                    onClick={() => handleSaveAndNavigate(nextParticipantId, isEvaluated)}
                    endIcon={<ChevronRight size={16} />}
                    sx={{
                      flex: { xs: 1, sm: 'none' },
                      bgcolor: '#0d9488',
                      color: '#ffffff',
                      fontWeight: 700,
                      minHeight: 40,
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#0f766e' },
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Lanjut →'}
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Main Mode Tabs */}
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: `${tokens.borderRadius.lg}px`,
            bgcolor: tokens.colors.surface,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeMainTab}
            onChange={(_e, v) => setActiveMainTab(v)}
            sx={{
              borderBottom: `1px solid ${tokens.colors.border}`,
              '& .MuiTab-root': {
                fontWeight: 700,
                fontSize: '0.9rem',
                minHeight: 52,
                textTransform: 'none',
              },
              '& .Mui-selected': { color: tokens.colors.primaryLight },
              '& .MuiTabs-indicator': { bgcolor: tokens.colors.primaryLight, height: 3 },
            }}
          >
            <Tab icon={<CheckSquare size={18} />} iconPosition="start" label="Checklist Penilaian" />
            <Tab icon={<UserCheck size={18} />} iconPosition="start" label="Informasi Peserta & Header" />
            <Tab icon={<FileText size={18} />} iconPosition="start" label="Catatan Trainer & Ringkasan" />
          </Tabs>
        </Paper>

        {/* TAB 0: Interactive Checklist Form */}
        {activeMainTab === 0 && (
          <Box>
            {/* DDT (Truck) Checklist Section Tabs */}
            {isDdt && (
              <Box>
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
                    {DDT_SECTIONS.map((sec, idx) => {
                      const answered = sec.items.filter(
                        (i) => answers[i.id] !== null && answers[i.id] !== undefined,
                      ).length;
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

                  {/* Section progress indicator */}
                  {(() => {
                    const totalAnswered = DDT_SECTIONS.reduce(
                      (acc, sec) =>
                        acc +
                        sec.items.filter(
                          (i) => answers[i.id] !== null && answers[i.id] !== undefined,
                        ).length,
                      0,
                    );
                    const totalItems = DDT_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0);
                    return (
                      <LinearProgress
                        variant="determinate"
                        value={totalItems > 0 ? (totalAnswered / totalItems) * 100 : 0}
                        sx={{
                          height: 3,
                          bgcolor: tokens.colors.borderLight,
                          '& .MuiLinearProgress-bar': { bgcolor: tokens.colors.primaryLight },
                        }}
                      />
                    );
                  })()}
                </Paper>

                {DDT_SECTIONS[currentSectionIndex] && (
                  <ChecklistSection
                    section={DDT_SECTIONS[currentSectionIndex]}
                    answers={answers}
                    onChange={handleAnswerChange}
                    assessmentType="DDT"
                  />
                )}
              </Box>
            )}

            {/* TMMIN Standard Forklift Checklist Tabs */}
            {isTmminStd && (
              <Box>
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
                      const totalDeduction = sec.items.reduce(
                        (sum, i) => sum + (tmminFrequencies[i.id] || 0) * i.deduction,
                        0,
                      );
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

                {TMMIN_CHECKLIST_DATA[currentSectionIndex] && (
                  <TmminChecklist
                    key={TMMIN_CHECKLIST_DATA[currentSectionIndex].code}
                    section={TMMIN_CHECKLIST_DATA[currentSectionIndex]}
                    frequencies={tmminFrequencies}
                    onChange={handleTmminFrequencyChange}
                  />
                )}
              </Box>
            )}

            {/* Forklift Refreshment Checklist Tabs */}
            {isRef && (
              <Box>
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
                      const totalDeduction = sec.items.reduce(
                        (sum, i) => sum + (refreshmentFrequencies[i.id] || 0) * i.deduction,
                        0,
                      );
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

                {FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex] && (
                  <ForkliftRefreshmentChecklist
                    key={FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex].code}
                    section={FORKLIFT_REFRESHMENT_SECTIONS[currentSectionIndex]}
                    frequencies={refreshmentFrequencies}
                    onChange={handleRefreshmentFrequencyChange}
                  />
                )}
              </Box>
            )}
          </Box>
        )}

        {/* TAB 1: Participant Header Information */}
        {activeMainTab === 1 && (
          <Box>
            <AssessmentHeader
              info={headerInfo}
              onChange={setHeaderInfo}
              errors={headerErrors}
              assessmentType={assessmentType}
            />
          </Box>
        )}

        {/* TAB 2: Trainer Notes & Summary */}
        {activeMainTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: `${tokens.borderRadius.lg}px`,
                border: `1px solid ${tokens.colors.border}`,
                bgcolor: tokens.colors.surface,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary, mb: 1 }}>
                Catatan Trainer & Evaluasi
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mb: 2 }}>
                Tambahkan alasan revisi, evaluasi performa peserta, atau rekomendasi perbaikan.
              </Typography>
              <TextField
                id="edit-trainer-notes"
                label="Catatan Trainer"
                value={trainerNotes}
                onChange={(e) => setTrainerNotes(e.target.value)}
                multiline
                minRows={5}
                fullWidth
                placeholder="Tulis catatan evaluasi atau rekomendasi trainer di sini..."
              />
            </Paper>

            {/* Opsi Diskualifikasi Fatal (Human Error) */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: `${tokens.borderRadius.lg}px`,
                border: `2px solid ${isFatalDisqualified ? '#ef4444' : tokens.colors.border}`,
                bgcolor: isFatalDisqualified ? '#fef2f2' : tokens.colors.surface,
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      id="checkbox-fatal-disqualification"
                      checked={isFatalDisqualified}
                      onChange={(e) => setIsFatalDisqualified(e.target.checked)}
                      sx={{
                        color: '#ef4444',
                        '&.Mui-checked': {
                          color: '#dc2626',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isFatalDisqualified ? '#b91c1c' : tokens.colors.text.primary }}>
                        Diskualifikasi Peserta (Pelanggaran Fatal / Human Error)
                      </Typography>
                      <Typography variant="body2" sx={{ color: isFatalDisqualified ? '#991b1b' : tokens.colors.text.secondary }}>
                        Centang opsi ini jika peserta melakukan pelanggaran keselamatan berat atau kesalahan fatal. Status kelulusan akan otomatis dikunci menjadi <strong>FAIL</strong> terlepas dari skor poin checklist.
                      </Typography>
                    </Box>
                  }
                />
              </Box>

              {isFatalDisqualified && (
                <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px dashed #fca5a5' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991b1b', mb: 1.5 }}>
                    Pilih Alasan Diskualifikasi:
                  </Typography>
                  <RadioGroup
                    value={selectedFatalReason}
                    onChange={(e) => setSelectedFatalReason(e.target.value)}
                  >
                    {FATAL_DISQUALIFICATION_PRESETS.map((reason) => (
                      <FormControlLabel
                        key={reason}
                        value={reason}
                        control={<Radio size="small" sx={{ color: '#ef4444', '&.Mui-checked': { color: '#dc2626' } }} />}
                        label={<Typography variant="body2" sx={{ fontWeight: 600, color: '#7f1d1d' }}>{reason}</Typography>}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </RadioGroup>

                  {selectedFatalReason === 'Human error / alasan lainnya' && (
                    <Box sx={{ mt: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Ketik Alasan Human Error / Pelanggaran Fatal"
                        placeholder="Contoh: Mengoperasikan unit secara berbahaya atau melanggar SOP krusial..."
                        value={customFatalReason}
                        onChange={(e) => setCustomFatalReason(e.target.value)}
                        sx={{
                          bgcolor: '#ffffff',
                          '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                        }}
                      />
                    </Box>
                  )}

                  <Alert severity="error" sx={{ mt: 2, bgcolor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                    <strong>Perhatian:</strong> Peserta ini akan didiskualifikasi dengan status <strong>FAIL</strong>. Alasan: <em>&ldquo;{effectiveFatalReason}&rdquo;</em>.
                  </Alert>
                </Box>
              )}
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: `${tokens.borderRadius.lg}px`,
                border: `1px solid ${tokens.colors.border}`,
                bgcolor: tokens.colors.surface,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary, mb: 2 }}>
                Ringkasan Penilaian Terkini
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: tokens.colors.background, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
                    Total Pengurangan (Deduction)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: tokens.colors.status.danger, mt: 0.5 }}>
                    -{scoreResult.totalDeduction} pts
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: tokens.colors.background, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
                    Skor Akhir
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: hasStartedFilling ? tokens.colors.primaryLight : tokens.colors.text.secondary, mt: 0.5 }}>
                    {hasStartedFilling ? `${scoreResult.score.toFixed(1)} / 100` : '— / 100'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: tokens.colors.background, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
                    Hasil Kelulusan (Passing Grade {passingScore}%)
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={hasStartedFilling ? (isFatalDisqualified ? 'FAIL (DISKUALIFIKASI)' : scoreResult.result) : 'Belum Dinilai'}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        bgcolor: hasStartedFilling
                          ? (isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg)
                          : tokens.colors.borderLight,
                        color: hasStartedFilling
                          ? (isPassing ? tokens.colors.status.success : tokens.colors.status.danger)
                          : tokens.colors.text.secondary,
                      }}
                    />
                  </Box>
                  {isFatalDisqualified && (
                    <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600, display: 'block', mt: 0.75 }}>
                      * Terkunci FAIL karena diskualifikasi fatal
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Sticky Bottom Action Footer — Menyesuaikan Area Konten & Status Sidebar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: {
            xs: 0,
            md: `${sidebarWidth}px`,
          },
          width: {
            xs: '100%',
            md: `calc(100% - ${sidebarWidth}px)`,
          },
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.08)',
          zIndex: 100,
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          transition: 'left 0.2s ease, width 0.2s ease',
        }}
      >
        {/* Left: Live Score readout */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600, display: 'block', lineHeight: 1 }}>
              {hasStartedFilling ? 'Skor Otomatis Terkini:' : 'Skor Asesmen:'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.25 }}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.3rem' }, color: hasStartedFilling ? tokens.colors.text.primary : tokens.colors.text.secondary, lineHeight: 1 }}>
                {hasStartedFilling ? scoreResult.score.toFixed(1) : '—'}
                <span style={{ fontSize: '0.85rem', color: tokens.colors.text.secondary, fontWeight: 500 }}> / 100</span>
              </Typography>
              <Chip
                label={hasStartedFilling ? (isFatalDisqualified ? 'FAIL (DISKUALIFIKASI)' : scoreResult.result) : 'Belum Dinilai'}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  height: 22,
                  bgcolor: hasStartedFilling
                    ? (isPassing ? tokens.colors.status.successBg : tokens.colors.status.dangerBg)
                    : tokens.colors.borderLight,
                  color: hasStartedFilling
                    ? (isPassing ? tokens.colors.status.success : tokens.colors.status.danger)
                    : tokens.colors.text.secondary,
                }}
              />
            </Box>
          </Box>
          {hasStartedFilling && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: tokens.colors.status.danger, fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
                &bull; Ded: -{scoreResult.totalDeduction} pts
              </Typography>
              {Boolean(scoreResult.timePenalty || scoreResult.overtimePenalty) && (
                <Chip
                  label={`Penalti Waktu: -${scoreResult.timePenalty || scoreResult.overtimePenalty} pts`}
                  size="small"
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#b91c1c',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                    border: '1px solid #fca5a5',
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Right: Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => router.push('/assessment/history')}
                disabled={saving}
                sx={{ minHeight: 44, fontWeight: 600 }}
              >
                {isBatchMode ? 'Kembali ke History' : 'Batal'}
              </Button>

              {isBatchMode && prevParticipantId && (
                <Button
                  variant="outlined"
                  disabled={saving}
                  onClick={() => handleSaveAndNavigate(prevParticipantId, false)}
                  startIcon={<ChevronLeft size={18} />}
                  sx={{
                    minHeight: 44,
                    fontWeight: 600,
                    borderColor: '#99f6e4',
                    color: '#0f766e',
                    '&:hover': { borderColor: '#0d9488', bgcolor: '#f0fdfa' },
                  }}
                >
                  Peserta Sebelumnya
                </Button>
              )}

              {/* Simpan Draft (Available in both Single & Batch modes) */}
              <Button
                id="edit-save-draft-btn"
                variant="outlined"
                disabled={saving}
                onClick={() => void handleSaveDraft()}
                startIcon={<Save size={18} />}
                sx={{
                  minHeight: 44,
                  fontWeight: 600,
                  borderColor: tokens.colors.border,
                  color: tokens.colors.text.primary,
                  '&:hover': {
                    borderColor: tokens.colors.primary,
                    bgcolor: 'rgba(59, 130, 246, 0.04)',
                  },
                }}
              >
                {saving ? 'Menyimpan...' : 'Simpan Draft'}
              </Button>

              {!isBatchMode ? (
                <Button
                  id="edit-finalize-submit-btn"
                  variant="contained"
                  disabled={saving}
                  onClick={() => void handleFinalizeAndSubmit()}
                  startIcon={<CheckCircle2 size={18} />}
                  sx={{
                    minHeight: 44,
                    minWidth: { xs: 180, sm: 240 },
                    fontWeight: 700,
                    bgcolor: '#059669',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#047857' },
                  }}
                >
                  {saving
                    ? 'Menyimpan...'
                    : isAssessmentCompleted
                    ? 'Simpan Perubahan'
                    : 'Selesaikan & Submit Penilaian'}
                </Button>
              ) : (
                nextParticipantId ? (
                  <Button
                    id="btn-batch-next"
                    variant="contained"
                    disabled={saving}
                    onClick={() => handleSaveAndNavigate(nextParticipantId, isEvaluated)}
                    endIcon={<ChevronRight size={18} />}
                    sx={{
                      minHeight: 44,
                      minWidth: { xs: 180, sm: 260 },
                      fontWeight: 700,
                      bgcolor: '#0d9488',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#0f766e' },
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan & Peserta Selanjutnya →'}
                  </Button>
                ) : (
                  <Button
                    id="btn-batch-finish"
                    variant="contained"
                    disabled={saving}
                    onClick={() => handleSaveAndFinishBatch()}
                    startIcon={<CheckCircle2 size={18} />}
                    sx={{
                      minHeight: 44,
                      minWidth: { xs: 180, sm: 260 },
                      fontWeight: 700,
                      bgcolor: '#059669',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#047857' },
                    }}
                  >
                    {saving ? 'Menyimpan...' : 'Simpan & Selesaikan Batch'}
                  </Button>
                )
              )}
        </Box>
      </Box>
    </AppShell>
  );
}
