// ============================================================
// SLEC - Assessment Domain Logic
// ============================================================

// ---- Assessment Types ----

export type AssessmentType = 'DDT' | 'TMMIN';
export type AssessmentResult = 'PASS' | 'FAIL' | 'DISQUALIFIED';
export type ChecklistAnswer = 'YES' | 'NO' | null;

// ---- DDT Header Info ----

export function getAssessmentDisplayName(type: string): string {
  if (!type) return '';
  if (type === 'TMMIN') return 'Forklift Operation';
  if (type === 'DDT') return 'Truck Assessment';
  return type;
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
  instruktur: string;
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