// ============================================================
// SLEC - Assessment Domain Logic
// ============================================================

export {
  formatPlatPolisi,
  formatNoBody,
  formatNoLambung,
  formatVehicleIdentifier,
  cleanTrainerNotes,
  extractDisqualificationReason,
  formatPersonName,
} from './utils';

// ---- Assessment Types ----

export type AssessmentType = 'DDT' | 'TMMIN' | 'TMMIN_STANDARD' | 'TMMIN_REFRESHMENT';
export type TrainingProgram = 'NEOP' | 'REFRESHMENT' | 'RETRAINING' | 'TEST_DRIVE' | '';
export type AssessmentResult = 'PASS' | 'FAIL' | 'DISQUALIFIED';
export type ChecklistAnswer = 'YES' | 'NO' | null;

export const TRAINING_PROGRAM_OPTIONS = [
  { value: 'NEOP', label: 'NEOP' },
  { value: 'REFRESHMENT', label: 'Refreshment' },
  { value: 'RETRAINING', label: 'Retraining' },
  { value: 'TEST_DRIVE', label: 'Test Drive' },
] as const;

export function getTrainingProgramLabel(program?: string | null): string {
  if (!program) return '—';
  const clean = program.trim();
  const cleanUpper = clean.toUpperCase();
  if (
    cleanUpper === 'NEOP' ||
    cleanUpper.includes('NEOP') ||
    cleanUpper.includes('NEW EMPLOYEE ORIENTATION PROGRAM')
  ) {
    return 'NEOP';
  }
  const cleanKey = cleanUpper.replace(/\s+/g, '_');
  const found = TRAINING_PROGRAM_OPTIONS.find(
    (p) => p.value === cleanKey || p.label.toUpperCase() === cleanUpper
  );
  return found ? found.label : program;
}

// ---- DDT Header Info ----

export function isForkliftAssessment(typeOrObj?: any): boolean {
  if (!typeOrObj) return false;
  const type = (typeof typeOrObj === 'string' ? typeOrObj : typeOrObj.assessmentType || '').toUpperCase().trim();
  const vehicle = (typeof typeOrObj === 'object' && typeOrObj.vehicleType ? typeOrObj.vehicleType : '').toUpperCase().trim();
  const program = (typeof typeOrObj === 'object' && typeOrObj.trainingProgram ? typeOrObj.trainingProgram : '').toUpperCase().trim();
  return (
    type === 'TMMIN' ||
    type === 'TMMIN_STANDARD' ||
    type === 'TMMIN_REFRESHMENT' ||
    type.includes('FORKLIFT') ||
    vehicle.includes('FORKLIFT') ||
    program.includes('FORKLIFT')
  );
}

export const isForklift = isForkliftAssessment;

export function isForkliftRefreshment(type?: AssessmentType | string | null): boolean {
  return type === 'TMMIN_REFRESHMENT';
}

export function isForkliftStandard(type?: AssessmentType | string | null): boolean {
  return type === 'TMMIN' || type === 'TMMIN_STANDARD';
}

export function getAssessmentDisplayName(type?: string | null): string {
  if (!type) return '';
  if (type === 'TMMIN' || type === 'TMMIN_STANDARD') return 'Forklift - Standard';
  if (type === 'TMMIN_REFRESHMENT') return 'Forklift - Refreshment';
  if (type === 'DDT') return 'Truck Assessment DDT';
  return type;
}

export function getPassingScore(type?: string | null): number {
  return type === 'TMMIN_REFRESHMENT' ? 75 : 70;
}

/**
 * Standarisasi Format No. Dokumen Cetak Asesmen untuk Audit Tracking:
 * Format: SLEC/${tipeUjian}/${tahun}/${bulan}/${id.slice(0, 8).toUpperCase()}
 * Contoh Output:
 * - SLEC/DDT/2026/10/F513E16A
 * - SLEC/FORKLIFT/2026/10/F513E16A
 */
export function formatAuditDocNumber(
  id?: string | null,
  assessmentType?: string | null,
  assessmentDate?: string | Date | null
): string {
  // 1. Tipe Ujian: DDT atau FORKLIFT (standar audit SLEC)
  let tipeUjian = 'DOC';
  const typeUpper = (assessmentType || '').toUpperCase().trim();
  if (typeUpper === 'DDT' || typeUpper.includes('DDT')) {
    tipeUjian = 'DDT';
  } else if (
    typeUpper === 'TMMIN' ||
    typeUpper === 'TMMIN_STANDARD' ||
    typeUpper === 'TMMIN_REFRESHMENT' ||
    typeUpper.includes('FORKLIFT')
  ) {
    tipeUjian = 'FORKLIFT';
  } else if (typeUpper) {
    tipeUjian = typeUpper.replace(/[^A-Z0-9]/g, '') || 'DOC';
  }

  // 2. Tahun dan Bulan
  let tahun = '';
  let bulan = '';

  if (assessmentDate) {
    if (typeof assessmentDate === 'string') {
      const match = assessmentDate.match(/^(\d{4})-(\d{2})/);
      if (match) {
        tahun = match[1];
        bulan = match[2];
      }
    }
    if (!tahun || !bulan) {
      const d = typeof assessmentDate === 'string' ? new Date(assessmentDate) : assessmentDate;
      if (!isNaN(d.getTime())) {
        tahun = String(d.getFullYear());
        bulan = String(d.getMonth() + 1).padStart(2, '0');
      }
    }
  }

  if (!tahun || !bulan) {
    const now = new Date();
    tahun = String(now.getFullYear());
    bulan = String(now.getMonth() + 1).padStart(2, '0');
  }

  // 3. ID Slice (8 karakter pertama dalam huruf kapital)
  const shortId = id && id !== 'AS-DRAFT' ? id.slice(0, 8).toUpperCase() : 'DRAFT';

  return `SLEC/${tipeUjian}/${tahun}/${bulan}/${shortId}`;
}

export interface DDTHeaderInfo {
  tanggal: string;
  lokasiTest: string;
  jenisKendaraan: string;
  noPolisi: string;
  namaPeserta: string;
  umur: string;
  golSIM: string;
  masaBerlakuSIM: string;
  sioKemnaker?: string;
  instruktur: string;
  trainingProgram: TrainingProgram;
}

// ---- Checklist Item ----

export interface ChecklistItem {
  id: string;
  description: string;
  deductionPoint: number;
  text?: string;
  penalty?: number;
  points?: number;
}

// ---- Section ----

export interface AssessmentSection {
  id: string;
  label: string;
  title?: string;
  totalPoint: number;
  points?: number;
  timeLimitSeconds: number;
  items: ChecklistItem[];
}

// ---- Answer Map ----

export type AnswerMap = Record<string, ChecklistAnswer>;

// ---- Scoring ----

export interface SectionScore {
  sectionId: string;
  deduction: number;
  unansweredCount: number;
}

export interface DDTScoreResult {
  totalPoint: number;
  totalDeduction: number;
  actual: number;
  score: number;
  result: AssessmentResult;
  sectionScores: SectionScore[];
}

export function calculateDDTScore(
  sections: AssessmentSection[],
  answers: AnswerMap,
): DDTScoreResult {
  const totalPoint = sections.reduce((sum, s) => sum + s.totalPoint, 0);

  const sectionScores: SectionScore[] = sections.map((section) => {
    let deduction = 0;
    let unansweredCount = 0;
    for (const item of section.items) {
      const answer = answers[item.id];
      if (answer === 'NO') {
        deduction += item.deductionPoint;
      } else if (answer === null || answer === undefined) {
        unansweredCount++;
      }
    }
    return { sectionId: section.id, deduction, unansweredCount };
  });

  const totalDeduction = sectionScores.reduce((sum, s) => sum + s.deduction, 0);
  const actual = Math.max(0, totalPoint - totalDeduction);
  const score = totalPoint > 0 ? (actual / totalPoint) * 100 : 0;
  const result: AssessmentResult = score >= 70 ? 'PASS' : 'FAIL';

  return { totalPoint, totalDeduction, actual, score, result, sectionScores };
}

export function countUnanswered(sections: AssessmentSection[], answers: AnswerMap): number {
  return sections.reduce(
    (total, section) =>
      total +
      section.items.filter(
        (item) => answers[item.id] === null || answers[item.id] === undefined,
      ).length,
    0,
  );
}

export function initAnswerMap(sections: AssessmentSection[]): AnswerMap {
  const map: AnswerMap = {};
  for (const section of sections) {
    for (const item of section.items) {
      map[item.id] = null;
    }
  }
  return map;
}

export { getSectionTimeLimit, getAssessmentTimeLimits } from '@/features/assessment/scoringEngine';
