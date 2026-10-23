import type { AssessmentType, AnswerMap, DDTScoreResult } from '@/lib/assessment';
import { calculateDDTScore } from '@/lib/assessment';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import { TMMIN_CHECKLIST_DATA, calculateTmminScore } from '@/features/assessment/tmmin';
import {
  FORKLIFT_REFRESHMENT_SECTIONS,
  calculateForkliftRefreshmentScore,
  FORKLIFT_REFRESHMENT_STANDARD_TIME_SECONDS,
  FORKLIFT_REFRESHMENT_MAX_TIME_SECONDS,
} from '@/features/assessment/forkliftRefreshment';

export interface AssessmentScoreParams {
  assessmentType: AssessmentType | string;
  answers?: AnswerMap;
  tmminFrequencies?: Record<string, number>;
  refreshmentFrequencies?: Record<string, number>;
  elapsedSeconds?: number;
}

export interface UnifiedScoreOutput {
  totalPoint: number;
  totalDeduction: number;
  actual: number;
  score: number;
  result: 'PASS' | 'FAIL' | 'DISQUALIFIED';
  sectionScores?: any[];
  overtimePenalty?: number;
  timePenalty?: number;
  elapsedSeconds?: number;
}

/**
 * Unified Scoring Engine for both Single Assessment and Batch Assessment.
 * Ensures 100% DRY calculation across all assessment types.
 */
export function calculateAssessmentScore({
  assessmentType,
  answers = {},
  tmminFrequencies = {},
  refreshmentFrequencies = {},
  elapsedSeconds = 0,
}: AssessmentScoreParams): UnifiedScoreOutput {
  if (assessmentType === 'TMMIN_REFRESHMENT') {
    return calculateForkliftRefreshmentScore(refreshmentFrequencies, elapsedSeconds);
  }

  if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
    return calculateTmminScore(tmminFrequencies, elapsedSeconds);
  }

  // Default: DDT
  const ddtResult = calculateDDTScore(DDT_SECTIONS, answers);
  return {
    ...ddtResult,
    elapsedSeconds,
  };
}

/**
 * Returns the total number of checklist items for a given assessment type.
 */
export function getAssessmentTotalItems(assessmentType: AssessmentType | string): number {
  if (assessmentType === 'DDT') {
    return DDT_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0);
  }
  if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
    return TMMIN_CHECKLIST_DATA.reduce((acc, sec) => acc + sec.items.length, 0);
  }
  if (assessmentType === 'TMMIN_REFRESHMENT') {
    return FORKLIFT_REFRESHMENT_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0);
  }
  return 0;
}

/**
 * Returns count of answered items.
 */
export function getAssessmentAnsweredCount({
  assessmentType,
  answers = {},
  tmminFrequencies = {},
  refreshmentFrequencies = {},
}: {
  assessmentType: AssessmentType | string;
  answers?: AnswerMap;
  tmminFrequencies?: Record<string, number>;
  refreshmentFrequencies?: Record<string, number>;
}): number {
  if (assessmentType === 'DDT') {
    return Object.values(answers).filter((val) => val === 'YES' || val === 'NO').length;
  }
  if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
    return Object.values(tmminFrequencies).filter((val) => typeof val === 'number' && val > 0).length;
  }
  if (assessmentType === 'TMMIN_REFRESHMENT') {
    return Object.values(refreshmentFrequencies).filter((val) => typeof val === 'number' && val > 0).length;
  }
  return 0;
}

/**
 * Returns standard and maximum time limits in seconds for timer components.
 */
export function getAssessmentTimeLimits(assessmentType: AssessmentType | string): {
  label: string;
  standardSeconds: number;
  maxSeconds?: number;
} {
  if (assessmentType === 'TMMIN_REFRESHMENT') {
    return {
      label: 'Forklift Operation (Refreshment)',
      standardSeconds: FORKLIFT_REFRESHMENT_STANDARD_TIME_SECONDS, // 600s = 10m
      maxSeconds: FORKLIFT_REFRESHMENT_MAX_TIME_SECONDS, // 900s = 15m
    };
  }
  if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
    return {
      label: 'Forklift Operation (Standard)',
      standardSeconds: 480, // 480s = 8m
      maxSeconds: 600, // 600s = 10m
    };
  }
  return {
    label: 'Truck Assessment (DDT)',
    standardSeconds: 600,
  };
}

/**
 * Returns standard time limit in seconds for a specific section.
 */
export function getSectionTimeLimit(assessmentType: AssessmentType | string, sectionCode: string): number {
  const normType = (assessmentType || '').toUpperCase().trim();
  const code = (sectionCode || '').toUpperCase().trim();

  if (normType === 'TMMIN_REFRESHMENT') {
    if (code === 'S1') return 120; // Persiapan: 2m
    if (code === 'S2') return 240; // Loading: 4m
    if (code === 'S3') return 240; // Unloading: 4m
    return 200;
  }

  if (normType === 'TMMIN' || normType === 'TMMIN_STANDARD') {
    if (code === 'S1') return 120; // 2m
    if (code === 'S2') return 120; // 2m
    if (code === 'S3') return 120; // 2m
    if (code === 'S4') return 60;  // 1m
    if (code === 'S5') return 60;  // 1m
    return 96;
  }

  // DDT (Truck Assessment)
  if (code === 'A') return 300; // PTI: 5m
  if (code === 'B') return 300; // SLALOM: 5m
  if (code === 'C') return 300; // SERI: 5m
  if (code === 'D') return 300; // PARKIR PARALEL: 5m
  if (code === 'E') return 900; // PERILAKU MENGEMUDI: 15m
  return 300;
}
