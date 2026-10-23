import AppShell from '@/components/layout/AppShell';
import ReportsTable, { type ReportRow } from '@/components/reports/ReportsTable';
import { prisma } from '@/lib/prisma';
import {
  getAssessmentDisplayName,
  formatAuditDocNumber,
  formatVehicleIdentifier,
  formatPersonName,
} from '@/lib/assessment';
import {
  PRISMA_MATRIX_ASSESSMENT_WHERE,
  isAssessmentCompleted,
  isDrivingAssessment,
  isForkliftAssessment,
} from '@/lib/matrixService';

function normalizeStatus(result: string) {
  return result === 'PASS' || result === 'LULUS' ? 'PASS' : 'FAIL';
}

function levelFor(score: number, status: 'PASS' | 'FAIL') {
  if (status === 'PASS' && score >= 85) return 'Hijau' as const;
  if (score >= 70) return 'Kuning' as const;
  return 'Merah' as const;
}

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  let assessments: any[] = [];
  try {
    assessments = await prisma.assessment.findMany({
      where: PRISMA_MATRIX_ASSESSMENT_WHERE,
      orderBy: [
        { assessmentDate: 'desc' },
        { createdAt: 'desc' },
      ],
      include: { sections: { include: { answers: true } } },
    });
  } catch (error) {
    console.warn('[ReportsPage] Database query error or unreachable:', (error as any)?.message);
  }

  const validAssessments = assessments.filter(isAssessmentCompleted);

  // 1. Kelompokkan seluruh riwayat asesmen selesai (PASS / FAIL / DISQUALIFIED) per driver
  const driverAssessmentsMap = new Map<string, typeof validAssessments>();
  for (const assessment of validAssessments) {
    const rawName = assessment.participantName?.trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (!driverAssessmentsMap.has(key)) {
      driverAssessmentsMap.set(key, []);
    }
    driverAssessmentsMap.get(key)!.push(assessment);
  }

  // 2. Ambil entri driver unik berdasarkan urutan asesmen terbaru (validAssessments sudah terurut desc)
  const seenDrivers = new Set<string>();
  const rows: ReportRow[] = [];

  for (const assessment of validAssessments) {
    const rawName = assessment.participantName?.trim();
    const key = rawName ? rawName.toLowerCase() : '';
    if (key && seenDrivers.has(key)) {
      continue;
    }
    if (key) {
      seenDrivers.add(key);
    }

    const driverHistory = (key && driverAssessmentsMap.get(key)) || [assessment];

    // Ambil nilai asesmen terakhir yang berstatus selesai/lulus per kategori untuk masing-masing driver:
    // a. drivingScore: skor dari Truck Assessment DDT
    const latestDriving = driverHistory.find((a: any) => isDrivingAssessment(a));
    const drivingAverage =
      latestDriving && latestDriving.score !== null && latestDriving.score !== undefined
        ? Number(latestDriving.score)
        : null;

    // b. forkliftScore: skor dari Forklift Standard atau Forklift Refreshment
    const latestForklift = driverHistory.find((a: any) => isForkliftAssessment(a));
    const forkliftAverage =
      latestForklift && latestForklift.score !== null && latestForklift.score !== undefined
        ? Number(latestForklift.score)
        : null;

    const score = Number(assessment.score) || 0;
    const status = normalizeStatus(assessment.result);

    const isFork = isForkliftAssessment(assessment);
    const formattedPlate = formatVehicleIdentifier(assessment.licensePlate, isFork);
    const docNo = formatAuditDocNumber(
      assessment.id,
      assessment.assessmentType,
      assessment.assessmentDate || assessment.createdAt
    );

    rows.push({
      id: assessment.id,
      driver: formatPersonName(assessment.participantName) || 'Driver Belum Bernama',
      nik: formattedPlate,
      plateOrUnit: formattedPlate,
      docNumber: docNo,
      program: getAssessmentDisplayName(assessment.assessmentType),
      assessmentType: assessment.assessmentType,
      drivingAverage,
      forkliftAverage,
      score,
      level: levelFor(score, status),
      status,
      evaluationDate: (assessment.assessmentDate || assessment.createdAt).toISOString(),
    });
  }

  return (
    <AppShell pageTitle="Laporan & Rekapitulasi Performa">
      <ReportsTable data={rows} />
    </AppShell>
  );
}

