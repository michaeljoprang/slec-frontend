import { prisma } from '@/lib/prisma';
import DashboardView from './dashboard/DashboardView';
import { PRISMA_MATRIX_ASSESSMENT_WHERE, isAssessmentCompleted } from '@/lib/matrixService';
import { formatPersonName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const isPass = (result: string) => ['PASS', 'LULUS'].includes(result.toUpperCase());

export default async function DashboardPage() {
  let rawAssessments: any[] = [];
  try {
    rawAssessments = await prisma.assessment.findMany({
      where: PRISMA_MATRIX_ASSESSMENT_WHERE,
      orderBy: { createdAt: 'desc' },
      include: { sections: { include: { answers: true } } },
    });
  } catch (error) {
    console.warn('[DashboardPage] Database query error or unreachable:', (error as any)?.message);
  }
  const assessments = rawAssessments.filter(isAssessmentCompleted);
  const now = new Date();
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const rows = assessments.filter(item => {
      const date = new Date(item.assessmentDate);
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
    });
    return {
      month: month.toLocaleDateString('id-ID', { month: 'short' }),
      pass: rows.filter(item => isPass(item.result)).length,
      fail: rows.filter(item => !isPass(item.result)).length,
    };
  });
  const passed = assessments.filter(item => isPass(item.result)).length;
  const errors = new Map<string, number>();
  assessments.forEach((item: any) => item.sections?.forEach((section: any) => section.answers?.forEach((answer: any) => {
    if (answer.deductionPoint > 0) {
      const key = answer.itemName || answer.itemId;
      errors.set(key, (errors.get(key) || 0) + 1);
    }
  })));
  const sortedErrors = Array.from(errors.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxError = sortedErrors[0]?.[1] || 1;
  const stats = {
    total: assessments.length,
    passed,
    passRate: assessments.length ? Math.round((passed / assessments.length) * 100) : 0,
    today: assessments.filter(item => new Date(item.assessmentDate).toDateString() === now.toDateString()).length,
    avgScore: assessments.length ? assessments.reduce((sum, item) => sum + Number(item.score), 0) / assessments.length : 0,
  };
  const recent = assessments.slice(0, 5).map(item => ({
    id: item.id,
    driver: formatPersonName(item.participantName),
    training: item.assessmentType,
    date: new Date(item.assessmentDate).toLocaleDateString('id-ID'),
    score: Number(item.score),
    status: isPass(item.result) ? 'PASS' as const : 'FAIL' as const,
  }));
  const errorsData = sortedErrors.map(([name, count]) => ({ name, count, progress: Math.round((count / maxError) * 100) }));

  const serializedAssessments = assessments.map(item => ({
    id: item.id,
    participantName: formatPersonName(item.participantName),
    assessmentType: item.assessmentType || '',
    assessmentDate: (item.assessmentDate || item.createdAt).toISOString(),
    score: Number(item.score) || 0,
    result: item.result || '',
    deductions: (item.sections || []).flatMap((section: any) =>
      (section.answers || [])
        .filter((a: any) => a.deductionPoint > 0)
        .map((a: any) => a.itemName || a.itemId || 'Item Evaluasi')
    ),
  }));

  return (
    <DashboardView
      initialAssessments={serializedAssessments}
      stats={stats}
      chartData={chartData}
      recent={recent}
      errors={errorsData}
      errorsTitle="Top 3 Poin Evaluasi Terbanyak"
    />
  );
}
