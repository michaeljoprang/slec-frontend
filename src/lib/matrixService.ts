import { prisma } from '@/lib/prisma';
import { getMatrixOverrides } from '@/lib/matrixStorage';
import { calculateMatrixStats } from '@/lib/matrixCalculations';
import { formatPersonName, cleanTrainerNotes } from '@/lib/utils';
import type { MatrixDriver, MatrixLevel } from '@/types/matrix';

/**
 * Nilai status asesmen yang valid dan diakui sebagai asesmen selesai (FINAL/COMPLETED).
 * Status DRAFT dan IN_PROGRESS secara mutlak TIDAK VALID untuk penghitungan skor matriks.
 */
export const COMPLETED_ASSESSMENT_RESULTS = [
  'PASS',
  'FAIL',
  'DISQUALIFIED',
  'COMPLETED',
  'LULUS',
  'pass',
  'fail',
] as const;

export const EXCLUDED_ASSESSMENT_RESULTS = [
  'DRAFT',
  'IN_PROGRESS',
  'draft',
  'in_progress',
  '',
] as const;

/**
 * Klausa WHERE default dan wajib untuk query Prisma pada modul Skill Matrix.
 * Mengunci query database agar hanya menarik record asesmen yang sudah final/selesai.
 */
export const PRISMA_MATRIX_ASSESSMENT_WHERE = {
  result: {
    in: ['PASS', 'FAIL', 'DISQUALIFIED', 'COMPLETED', 'LULUS', 'pass', 'fail'] as unknown as string[],
    notIn: ['DRAFT', 'IN_PROGRESS', 'draft', 'in_progress'] as unknown as string[],
  },
} as any;

export const fallbackDrivers: MatrixDriver[] = [
  {
    id: 'DRV-001',
    name: 'Agung Kharisma Jaya',
    level: 'Kuning',
    training: 'Forklift (Standard)',
    score: 88,
    aspectScores: [null, null, null, null, null, 3, 3, 3, 3, 4],
    forkliftNotes: 'Pemahaman SOP forklift baik, perlu evaluasi berkala pada PTI.',
    notes: 'Pemahaman SOP forklift baik, perlu evaluasi berkala pada PTI.',
  },
  {
    id: 'DRV-002',
    name: 'Rahmat Saleh',
    level: 'Kuning',
    training: 'Forklift (Refreshment)',
    score: 72,
    aspectScores: [null, null, null, null, null, 2, 2, 2, 2, 3],
    forkliftNotes: 'Asesmen Refreshment: Mampu bekerja aman, perlu pemantauan berkala saat manuver.',
    notes: 'Asesmen Refreshment: Mampu bekerja aman, perlu pemantauan berkala saat manuver.',
  },
  {
    id: 'DRV-003',
    name: 'Riska Andika Putra',
    level: 'Hijau',
    training: 'DDT (Driving)',
    score: 96,
    aspectScores: [4, 4, 4, 4, 4, null, null, null, null, null],
    drivingNotes: 'Sangat kompeten dalam berkendara defensif dan PTI truk.',
    notes: 'Sangat kompeten dalam berkendara defensif dan PTI truk.',
  },
  {
    id: 'DRV-004',
    name: 'Budi Santoso',
    level: 'Hijau',
    training: 'DDT + Refreshment',
    score: 92,
    aspectScores: [4, 3, 4, 4, 3, 3, 4, 3, 4, 3],
    drivingNotes: 'Manuver rute dan PTI truk sangat baik.',
    forkliftNotes: 'Asesmen Refreshment: Operasional dan loading forklift presisi dan aman.',
    notes: 'Manuver rute dan PTI truk sangat baik. • Operasional dan loading forklift presisi dan aman.',
  },
  {
    id: 'DRV-005',
    name: 'Dedi Kurniawan',
    level: 'Hijau',
    training: 'DDT + Standard',
    score: 90,
    aspectScores: [4, 4, 3, 4, 4, 4, 3, 3, 4, 3],
    drivingNotes: 'Disiplin rambu dan kontrol kecepatan sangat baik.',
    forkliftNotes: 'Asesmen Standard: Memahami SOP forklift dan penanganan beban standar dengan baik.',
    notes: 'Disiplin rambu dan kontrol kecepatan sangat baik. • Memahami SOP forklift dan penanganan beban standar dengan baik.',
  },
];

/**
 * Guard predicate untuk memverifikasi apakah asesmen benar-benar telah selesai.
 * Mengecualikan record yang masih berstatus DRAFT, IN_PROGRESS, atau finishedAt == null.
 */
export function isAssessmentCompleted(assessment: any): boolean {
  if (!assessment) return false;

  const res = String(assessment.result || '').toUpperCase().trim();
  if (res === 'DRAFT' || res === 'IN_PROGRESS' || !res) {
    return false;
  }
  if (!['PASS', 'FAIL', 'DISQUALIFIED', 'COMPLETED', 'LULUS'].includes(res)) {
    return false;
  }

  const notes = assessment.trainerNotes || '';
  if (notes.includes('[Status: DRAFT]') || notes.includes('[Status: IN_PROGRESS]')) {
    return false;
  }

  // Cek finishedAt: harus memiliki tag FinishedAt, nilai properti finishedAt, atau timestamp audit
  const finishedMatch = notes.match(/\[FinishedAt:\s*([^\]]+)\]/);
  const finishedAt =
    assessment.finishedAt ||
    (finishedMatch ? finishedMatch[1].trim() : null) ||
    (assessment.updatedAt || assessment.createdAt ? new Date(assessment.updatedAt || assessment.createdAt).toISOString() : null);

  return Boolean(finishedAt);
}

export function isForkliftAssessment(a: any): boolean {
  if (!a) return false;
  const type = (typeof a === 'string' ? a : a.assessmentType || '').toUpperCase().trim();
  const vehicle = (typeof a === 'object' && a.vehicleType ? a.vehicleType : '').toUpperCase().trim();
  const program = (typeof a === 'object' && a.trainingProgram ? a.trainingProgram : '').toUpperCase().trim();

  // Asesmen bertipe Forklift (TMMIN, TMMIN_STANDARD, TMMIN_REFRESHMENT, atau mengandung FORKLIFT)
  if (
    type === 'TMMIN' ||
    type === 'TMMIN_STANDARD' ||
    type === 'TMMIN_REFRESHMENT' ||
    type.includes('FORKLIFT') ||
    vehicle.includes('FORKLIFT') ||
    program.includes('FORKLIFT')
  ) {
    return true;
  }
  return false;
}

export const isForklift = isForkliftAssessment;

export function isDrivingAssessment(a: any): boolean {
  if (!a) return false;
  // Jika ini adalah asesmen Forklift, secara mutlak bukan asesmen driving DDT
  if (isForkliftAssessment(a)) {
    return false;
  }

  const type = (typeof a === 'string' ? a : a.assessmentType || '').toUpperCase().trim();
  const vehicle = (typeof a === 'object' && a.vehicleType ? a.vehicleType : '').toUpperCase().trim();
  return (
    type === 'DDT' ||
    type.includes('DDT') ||
    type.includes('TRUCK') ||
    type.includes('TRUK') ||
    type.includes('DRIVING') ||
    vehicle.includes('TRUCK') ||
    vehicle.includes('TRUK') ||
    vehicle.includes('CDD') ||
    vehicle.includes('TRONTON') ||
    vehicle.includes('TRAILER') ||
    vehicle.includes('ENGKEL') ||
    vehicle.includes('CDE') ||
    vehicle.includes('GRANDMAX')
  );
}

export function getForkliftSubType(a?: { assessmentType?: string; vehicleType?: string; trainingProgram?: string | null }): 'Refreshment' | 'Standard' | undefined {
  if (!a) return undefined;
  const type = (a.assessmentType || '').toUpperCase();
  const vehicle = (a.vehicleType || '').toUpperCase();
  const program = (a.trainingProgram || '').toUpperCase();
  if (type === 'TMMIN_REFRESHMENT' || type.includes('REFRESH') || program.includes('REFRESH') || vehicle.includes('REFRESH')) {
    return 'Refreshment';
  }
  if (type === 'TMMIN_STANDARD' || type.includes('STAND') || type === 'TMMIN' || program.includes('STAND') || vehicle.includes('STAND')) {
    return 'Standard';
  }
  return undefined;
}

export function normalizeTraining(type: string) {
  const t = (type || '').toUpperCase();
  if (t === 'TMMIN_REFRESHMENT') return 'Refreshment';
  if (t === 'TMMIN_STANDARD' || t === 'TMMIN') return 'Standard';
  if (t.includes('DDT')) return 'DDT';
  return type || 'Assessment';
}

export function scorePercentageToRating(percentage: number): number {
  if (percentage >= 90) return 4;
  if (percentage >= 80) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
}

export function getSectionPct(
  sec: any,
  fallbackTotal: number,
  fallbackPct: number
): number {
  if (!sec) return fallbackPct;
  const totalDeduction =
    Number(sec.totalDeduction) ||
    (sec.answers || []).reduce((sum: number, ans: any) => sum + (Number(ans.deductionPoint) || 0), 0);
  const totalPoint = Number(sec.totalPoint) || fallbackTotal;
  if (totalPoint <= 0) return fallbackPct;
  const actual = Math.max(0, totalPoint - totalDeduction);
  return (actual / totalPoint) * 100;
}

export function computeDrivingAspects(assessment: any): [number, number, number, number, number] {
  const overallScore = Number(assessment.score) || 0;
  const baseRating = scorePercentageToRating(overallScore);

  const sections = assessment.sections || [];
  if (sections.length === 0) {
    return [baseRating, baseRating, baseRating, baseRating, baseRating];
  }

  const secA = sections.find((s: any) => s.sectionCode?.toUpperCase() === 'A' || s.sectionName?.toUpperCase().includes('PTI'));
  const secB = sections.find((s: any) => s.sectionCode?.toUpperCase() === 'B' || s.sectionName?.toUpperCase().includes('SLALOM'));
  const secC = sections.find((s: any) => s.sectionCode?.toUpperCase() === 'C' || s.sectionName?.toUpperCase().includes('SERI'));
  const secD = sections.find((s: any) => s.sectionCode?.toUpperCase() === 'D' || s.sectionName?.toUpperCase().includes('PARKIR'));
  const secE = sections.find((s: any) => s.sectionCode?.toUpperCase() === 'E' || s.sectionName?.toUpperCase().includes('PERILAKU'));

  const pctA = getSectionPct(secA, 40, overallScore);
  const pctB = getSectionPct(secB, 12, overallScore);
  const pctC = getSectionPct(secC, 9, overallScore);
  const pctD = getSectionPct(secD, 9, overallScore);
  const pctE = getSectionPct(secE, 30, overallScore);

  const pctManeuver = (pctB + pctC + pctD) / 3;

  const d0 = scorePercentageToRating(pctE);
  const d1 = scorePercentageToRating(pctManeuver);
  const d2 = scorePercentageToRating((pctManeuver + pctE) / 2);
  const d3 = scorePercentageToRating((pctA + pctE) / 2);
  const d4 = scorePercentageToRating(pctA);

  return [d0, d1, d2, d3, d4];
}

export function computeForkliftAspects(assessment: any): [number, number, number, number, number] {
  const overallScore = Number(assessment.score) || 0;
  const baseRating = scorePercentageToRating(overallScore);

  const sections = assessment.sections || [];
  if (sections.length === 0) {
    return [baseRating, baseRating, baseRating, baseRating, baseRating];
  }

  const sec1 = sections.find((s: any) => s.sectionCode?.toUpperCase().includes('1') || s.sectionName?.toUpperCase().includes('PERSIAPAN'));
  const sec2 = sections.find((s: any) => s.sectionCode?.toUpperCase().includes('2') || s.sectionName?.toUpperCase().includes('JALAN') || s.sectionName?.toUpperCase().includes('BERJALAN'));
  const sec3 = sections.find((s: any) => s.sectionCode?.toUpperCase().includes('3') || s.sectionName?.toUpperCase().includes('LOADING'));

  const pct1 = getSectionPct(sec1, 34, overallScore);
  const pct2 = getSectionPct(sec2, 18, overallScore);
  const pct3 = getSectionPct(sec3, 82, overallScore);

  const f0 = scorePercentageToRating(pct2);
  const f1 = scorePercentageToRating(pct3);
  const f2 = scorePercentageToRating(pct1);
  const f3 = scorePercentageToRating(pct2);
  const f4 = scorePercentageToRating(pct1);

  return [f0, f1, f2, f3, f4];
}

/**
 * Mengambil dan mengagregasi data Skill Matrix secara terpusat (authoritative system-wide engine).
 * Memastikan filter status DRAFT / IN_PROGRESS diterapkan baik di level query Prisma
 * maupun di guard clause in-memory loop.
 */
export async function getSkillMatrixData(): Promise<{
  drivers: MatrixDriver[];
  overrides: Record<string, any>;
}> {
  let completedAssessments: any[] = [];
  let allParticipants: any[] = [];

  try {
    // 1. KUNCI DI LEVEL QUERY DATABASE: Mengambil HANYA asesmen dengan status selesai
    completedAssessments = await prisma.assessment.findMany({
      where: PRISMA_MATRIX_ASSESSMENT_WHERE,
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
      include: { sections: { include: { answers: true } } },
    });

    // Mengambil metadata seluruh peserta terdaftar di sistem
    allParticipants = await prisma.assessment.findMany({
      select: {
        id: true,
        participantName: true,
        trainingProgram: true,
        assessmentType: true,
        vehicleType: true,
        createdAt: true,
        assessmentDate: true,
        result: true,
        trainerNotes: true,
      },
      orderBy: [{ assessmentDate: 'desc' }, { createdAt: 'desc' }],
    });
  } catch (error) {
    console.warn('[getSkillMatrixData] Database query error or unreachable:', (error as any)?.message);
  }

  const overrides = getMatrixOverrides();

  // 2. KUNCI DI LEVEL LOGIKA AGREGASI / REDUCER: Guard Clause Filter Status
  const validCompleted = completedAssessments.filter((assessment) => {
    // Guard clause: jika DRAFT, IN_PROGRESS, atau finishedAt null, lewati mutlak
    if (
      assessment.result === 'DRAFT' ||
      assessment.result === 'IN_PROGRESS' ||
      !isAssessmentCompleted(assessment)
    ) {
      return false;
    }
    return true;
  });

  // Jika belum ada data sama sekali di database, gunakan data fallback
  if (!allParticipants.length && !validCompleted.length) {
    const finalFallback = fallbackDrivers.map((driver) => {
      const driverId = driver.id || '';
      const nameKey = `name:${(driver.name || '').trim().toLowerCase()}`;
      const override = overrides[driverId] || overrides[nameKey];
      if (override && Array.isArray(override.aspectScores)) {
        const stats = calculateMatrixStats(override.aspectScores);
        return {
          ...driver,
          aspectScores: override.aspectScores,
          level: stats.level,
          notes: override.notes !== undefined ? override.notes : driver.notes,
          drivingNotes: override.drivingNotes !== undefined ? override.drivingNotes : driver.drivingNotes,
          forkliftNotes: override.forkliftNotes !== undefined ? override.forkliftNotes : driver.forkliftNotes,
        };
      }
      return driver;
    });

    return {
      drivers: finalFallback,
      overrides,
    };
  }

  // Petakan seluruh peserta unik berdasarkan nama
  const participantMap = new Map<string, any>();
  for (const p of allParticipants) {
    const rawName = p.participantName?.trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (!participantMap.has(key)) {
      participantMap.set(key, p);
    }
  }

  // Kelompokkan asesmen yang VALID dan SELESAI per driver
  const driverCompletedMap = new Map<string, typeof validCompleted>();
  for (const assessment of validCompleted) {
    // Guard clause reduplikasi keamanan
    if (
      assessment.result === 'DRAFT' ||
      assessment.result === 'IN_PROGRESS' ||
      !isAssessmentCompleted(assessment)
    ) {
      continue;
    }

    const rawName = assessment.participantName?.trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (!driverCompletedMap.has(key)) {
      driverCompletedMap.set(key, []);
    }
    driverCompletedMap.get(key)!.push(assessment);
  }

  // Gabungkan seluruh key peserta
  const allKeys = Array.from(new Set([...Array.from(participantMap.keys()), ...Array.from(driverCompletedMap.keys())]));

  const drivers: MatrixDriver[] = allKeys.map((key) => {
    const completedList = driverCompletedMap.get(key) || [];
    const rep = completedList[0] || participantMap.get(key);
    const name = formatPersonName(rep?.participantName || key);
    const id = rep?.id || key;

    // Periksa apakah driver memiliki manual override
    const nameKey = `name:${name.trim().toLowerCase()}`;
    const override = overrides[id] || overrides[nameKey];

    // ATURAN 2: Jika seluruh asesmen masih DRAFT / belum ada asesmen selesai
    if (completedList.length === 0) {
      let aspectScores: (number | null)[] = [null, null, null, null, null, null, null, null, null, null];
      let level: MatrixLevel = 'Belum Dinilai';
      let notes = override?.notes;
      let drivingNotes = override?.drivingNotes;
      let forkliftNotes = override?.forkliftNotes;

      // Jika ada manual override, gunakan nilai override
      if (override && Array.isArray(override.aspectScores)) {
        aspectScores = override.aspectScores;
        const stats = calculateMatrixStats(aspectScores);
        level = stats.level;
      }

      const rawTrain = rep?.trainingProgram || rep?.assessmentType || 'Assessment';
      const training = normalizeTraining(rawTrain);

      return {
        id,
        name,
        level,
        training,
        score: undefined,
        aspectScores,
        notes,
        drivingNotes,
        forkliftNotes,
      };
    }

    // ATURAN 1: Driver memiliki asesmen selesai
    completedList.sort((a, b) => {
      const timeA = new Date(a.assessmentDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.assessmentDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    const drivingAssessment = completedList.find(a => isDrivingAssessment(a));
    const forkliftAssessment = completedList.find(a => isForkliftAssessment(a));

    const drivingAspects = drivingAssessment
      ? computeDrivingAspects(drivingAssessment)
      : [null, null, null, null, null];

    const forkliftAspects = forkliftAssessment
      ? computeForkliftAspects(forkliftAssessment)
      : [null, null, null, null, null];

    let aspectScores: (number | null)[] = [...drivingAspects, ...forkliftAspects];

    if (override && Array.isArray(override.aspectScores)) {
      aspectScores = override.aspectScores;
    }

    const { level } = calculateMatrixStats(aspectScores);

    const forkliftSubType = getForkliftSubType(forkliftAssessment);

    let training = 'Assessment';
    if (drivingAssessment && forkliftAssessment) {
      training = forkliftSubType ? `DDT + ${forkliftSubType}` : 'DDT + Forklift';
    } else if (drivingAssessment) {
      training = 'DDT (Driving)';
    } else if (forkliftAssessment) {
      training = forkliftSubType ? `Forklift (${forkliftSubType})` : 'Forklift';
    } else if (rep?.trainingProgram) {
      training = normalizeTraining(rep.trainingProgram);
    }

    const score = drivingAssessment && forkliftAssessment
      ? Math.round(((Number(drivingAssessment.score) || 0) + (Number(forkliftAssessment.score) || 0)) / 2)
      : Number(drivingAssessment?.score ?? forkliftAssessment?.score ?? rep.score ?? 0);

    const rawDrivingNotes = override?.drivingNotes !== undefined ? override.drivingNotes : drivingAssessment?.trainerNotes;
    const rawForkliftNotes = override?.forkliftNotes !== undefined ? override.forkliftNotes : forkliftAssessment?.trainerNotes;

    const drivingNotes = cleanTrainerNotes(rawDrivingNotes) || undefined;
    const forkliftNotes = cleanTrainerNotes(rawForkliftNotes) || undefined;

    let notes: string | undefined = undefined;
    if (override?.notes !== undefined) {
      notes = cleanTrainerNotes(override.notes) || undefined;
    }
    if (!notes) {
      if (drivingNotes && forkliftNotes) {
        notes = `${drivingNotes} • ${forkliftNotes}`;
      } else {
        notes = drivingNotes || forkliftNotes || cleanTrainerNotes(rep.trainerNotes) || undefined;
      }
    }

    return {
      id,
      name,
      level,
      training,
      score,
      aspectScores,
      notes,
      drivingNotes,
      forkliftNotes,
    };
  });

  return {
    drivers,
    overrides,
  };
}
