'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardCheck, Clock3, Gauge, ShieldAlert, TrendingUp } from 'lucide-react';
import ResultBadge from '@/components/common/ResultBadge';
import AppShell from '@/components/layout/AppShell';
import DateRangeFilter, { isWithinDateRangeInclusive } from '@/components/common/DateRangeFilter';
import { getAssessmentDisplayName, formatPersonName } from '@/lib/assessment';

type Status = 'PASS' | 'FAIL';

export interface DashboardAssessmentItem {
  id: string;
  participantName: string;
  assessmentType: string;
  assessmentDate: string;
  score: number;
  result: string;
  deductions?: string[];
}

interface DashboardViewProps {
  initialAssessments?: DashboardAssessmentItem[];
  stats?: { total: number; passed?: number; passRate: number; today: number; avgScore: number };
  recent?: { id: string; driver: string; training: string; date: string; score: number; status: Status }[];
  errors?: { name: string; count: number; progress: number }[];
  errorsTitle?: string;
  chartData?: { month: string; pass: number; fail: number }[];
  distribution?: { name: string; value: number; count?: number; color: string }[];
}

const isPass = (result?: string) => ['PASS', 'LULUS'].includes((result || '').toUpperCase().trim());

const fallbackChart = [
  { month: 'Mei', pass: 18, fail: 4 }, { month: 'Jun', pass: 22, fail: 5 },
  { month: 'Jul', pass: 20, fail: 3 }, { month: 'Agu', pass: 27, fail: 6 },
  { month: 'Sep', pass: 31, fail: 4 }, { month: 'Okt', pass: 35, fail: 3 },
];
const fallbackRecent = [
  { id: '1', driver: 'Ahmad Fauzi', training: 'Forklift Refreshment', date: '15 Okt 2026', score: 92, status: 'PASS' as const },
  { id: '2', driver: 'Budi Santoso', training: 'Forklift Standard', date: '14 Okt 2026', score: 78, status: 'PASS' as const },
  { id: '3', driver: 'Citra Lestari', training: 'Forklift Refreshment', date: '14 Okt 2026', score: 61, status: 'FAIL' as const },
  { id: '4', driver: 'Dedi Irawan', training: 'Forklift Standard', date: '13 Okt 2026', score: 88, status: 'PASS' as const },
  { id: '5', driver: 'Eko Prasetyo', training: 'Forklift Refreshment', date: '12 Okt 2026', score: 55, status: 'FAIL' as const },
];

function formatTrainingName(training: string): string {
  if (!training) return '—';
  const clean = training.trim();
  const cleanUpper = clean.toUpperCase();
  if (cleanUpper === 'TMMIN' || cleanUpper === 'TMMIN_STANDARD' || cleanUpper === 'FORKLIFT STANDARD' || cleanUpper === 'STANDARD') {
    return 'Forklift - Standard';
  }
  if (cleanUpper === 'TMMIN_REFRESHMENT' || cleanUpper === 'FORKLIFT REFRESHMENT' || cleanUpper === 'REFRESHMENT') {
    return 'Forklift - Refreshment';
  }
  if (cleanUpper === 'DDT' || cleanUpper.includes('DDT') || cleanUpper.includes('TRUCK')) {
    return 'Truck Assessment DDT';
  }
  return getAssessmentDisplayName(clean) || clean;
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const values = new Map(payload.map(item => [item.dataKey, item.value]));
  return (
    <div className="rounded-lg bg-slate-800 p-3 text-xs text-white shadow-lg">
      <p className="mb-2 font-semibold text-slate-200">Bulan: {label}</p>
      <p className="flex items-center justify-between gap-6"><span className="text-emerald-400">Lulus</span><strong>{values.get('pass') ?? 0}</strong></p>
      <p className="flex items-center justify-between gap-6"><span className="text-rose-400">Gagal</span><strong>{values.get('fail') ?? 0}</strong></p>
    </div>
  );
}

export default function DashboardView({
  initialAssessments,
  stats,
  recent,
  errors,
  errorsTitle,
  chartData,
  distribution,
}: DashboardViewProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter raw assessments inclusively based on selected date range
  const filteredAssessments = useMemo(() => {
    if (!initialAssessments || initialAssessments.length === 0) return null;
    return initialAssessments.filter((item) =>
      isWithinDateRangeInclusive(item.assessmentDate, startDate, endDate)
    );
  }, [initialAssessments, startDate, endDate]);

  // Dynamic KPI Stats
  const resolvedStats = useMemo(() => {
    if (filteredAssessments) {
      const total = filteredAssessments.length;
      const passed = filteredAssessments.filter((item) => isPass(item.result)).length;
      const passRate = total ? Math.round((passed / total) * 100) : 0;
      const todayStr = new Date().toDateString();
      const today = filteredAssessments.filter(
        (item) => new Date(item.assessmentDate).toDateString() === todayStr
      ).length;
      const avgScore = total
        ? filteredAssessments.reduce((sum, item) => sum + item.score, 0) / total
        : 0;
      return { total, passed, passRate, today, avgScore };
    }
    const total = stats?.total ?? 128;
    const passed = stats?.passed ?? (stats ? Math.round(((stats.passRate ?? 0) * (stats.total ?? 0)) / 100) : 105);
    const passRate = stats?.passRate ?? 82;
    const today = stats?.today ?? 12;
    const avgScore = stats?.avgScore ?? 84.6;
    return { total, passed, passRate, today, avgScore };
  }, [filteredAssessments, stats]);

  // Dynamic Recent Activity Table
  const rows = useMemo(() => {
    if (filteredAssessments) {
      return filteredAssessments.slice(0, 5).map((item) => ({
        id: item.id,
        driver: formatPersonName(item.participantName),
        training: item.assessmentType,
        date: new Date(item.assessmentDate).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        score: item.score,
        status: (isPass(item.result) ? 'PASS' : 'FAIL') as Status,
      }));
    }
    return recent?.length ? recent : fallbackRecent;
  }, [filteredAssessments, recent]);

  // Dynamic Trend Area Chart
  const trend = useMemo(() => {
    if (filteredAssessments) {
      const now = new Date();
      return Array.from({ length: 6 }, (_, index) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
        const monthRows = filteredAssessments.filter((item) => {
          const date = new Date(item.assessmentDate);
          return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
        });
        return {
          month: month.toLocaleDateString('id-ID', { month: 'short' }),
          pass: monthRows.filter((item) => isPass(item.result)).length,
          fail: monthRows.filter((item) => !isPass(item.result)).length,
        };
      });
    }
    return chartData?.length ? chartData : fallbackChart;
  }, [filteredAssessments, chartData]);

  // Dynamic Result Distribution (Pie Chart)
  const resultDistribution = useMemo(() => {
    if (filteredAssessments) {
      const total = filteredAssessments.length;
      const passed = filteredAssessments.filter((item) => isPass(item.result)).length;
      const failed = total - passed;
      const passPct = total ? Math.round((passed / total) * 100) : 0;
      const failPct = total ? 100 - passPct : 0;
      return [
        { name: 'LULUS', value: passPct, count: passed, color: '#10b981' },
        { name: 'GAGAL', value: failPct, count: failed, color: '#ef4444' },
      ];
    }
    const totalFallback = stats?.total ?? 128;
    const passedFallback = stats?.passed ?? 105;
    const failedFallback = Math.max(0, totalFallback - passedFallback);
    return (
      distribution?.length
        ? distribution
        : [
            { name: 'LULUS', value: 82, count: passedFallback, color: '#10b981' },
            { name: 'GAGAL', value: 18, count: failedFallback, color: '#ef4444' },
          ]
    );
  }, [filteredAssessments, distribution, stats]);

  // Dynamic Improvement Areas / Top 3 Errors
  const improvementAreas = useMemo(() => {
    if (filteredAssessments) {
      const errorMap = new Map<string, number>();
      filteredAssessments.forEach((item) => {
        item.deductions?.forEach((name) => {
          errorMap.set(name, (errorMap.get(name) || 0) + 1);
        });
      });
      const sorted = Array.from(errorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (sorted.length > 0) {
        const maxError = sorted[0][1] || 1;
        return sorted.map(([name, count]) => ({
          name,
          count,
          progress: Math.round((count / maxError) * 100),
        }));
      }
    }
    return (
      errors?.length
        ? errors
        : [
            { name: 'Pemeriksaan sebelum operasi', count: 18, progress: 90 },
            { name: 'Penggunaan APD', count: 13, progress: 65 },
            { name: 'Prosedur keadaan darurat', count: 9, progress: 45 },
          ]
    );
  }, [filteredAssessments, errors]);

  const cards = [
    { label: 'TOTAL ASSESSMENTS', value: resolvedStats.total, detail: 'Seluruh assessment tercatat', icon: <ClipboardCheck size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'TINGKAT KELULUSAN', value: `${resolvedStats.passRate}%`, detail: 'Dari total assessment', icon: <TrendingUp size={20} />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'PENILAIAN HARI INI', value: resolvedStats.today, detail: 'Assessment pada hari ini', icon: <Clock3 size={20} />, color: 'text-teal-600 bg-teal-50' },
    { label: 'RATA-RATA SKOR', value: resolvedStats.avgScore.toFixed(1), detail: 'Rata-rata nilai keseluruhan', icon: <Gauge size={20} />, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <AppShell pageTitle="Dashboard Overview">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pantau performa assessment dan area operasional yang perlu ditingkatkan.
            </p>
          </div>
          {/* Filter Rentang Tanggal Standar SLEC */}
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onReset={() => {
              setStartDate('');
              setEndDate('');
            }}
          />
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="mb-4 flex items-start justify-between">
                <p className="text-xs font-bold tracking-wide text-slate-500">{card.label}</p>
                <span className={`rounded-lg p-2 ${card.color}`}>{card.icon}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-3xl font-bold text-slate-800">{card.value}</p>
                {card.label === 'TINGKAT KELULUSAN' && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {resolvedStats.passed} Lulus dari {resolvedStats.total}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:col-span-2">
            <h2 className="font-bold text-slate-900">Tren Assessment 6 Bulan Terakhir</h2>
            <p className="mb-4 text-sm text-slate-500">Perbandingan hasil lulus dan gagal</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4', strokeWidth: 1 }} wrapperStyle={{ zIndex: 50, outline: 'none' }} content={<TrendTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="pass" name="LULUS" stroke="#059669" fill="#d1fae5" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="fail" name="GAGAL" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="font-bold text-slate-900">Rasio Kelulusan</h2>
            <p className="text-sm text-slate-500">Distribusi hasil assessment</p>
            <div className="relative h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resultDistribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="78%" paddingAngle={3}>
                    {resultDistribution.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => {
                      const count = item?.payload?.count ?? 0;
                      return [`${count} Peserta (${value}%)`, name];
                    }}
                    wrapperStyle={{ zIndex: 50, outline: 'none' }}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '10px 12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px rgba(15,23,42,.22)',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value: string) => {
                      const item = resultDistribution.find((d) => d.name === value);
                      const count = item?.count ?? 0;
                      return (
                        <span className="text-xs font-semibold text-slate-700">
                          {value} ({count})
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">{resolvedStats.passRate}%</p>
                  <p className="text-xs font-medium text-slate-500">Pass Rate</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <article className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:col-span-2">
            <div className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-bold text-slate-900">Aktivitas Terbaru</h2>
                <p className="text-sm text-slate-500">5 riwayat assessment terakhir</p>
              </div>
              <Link href="/assessment/history" className="text-sm font-semibold text-blue-600 transition hover:text-blue-800">
                Lihat Semua →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    {['Driver', 'Training', 'Tanggal', 'Skor', 'Status'].map((label) => (
                      <th key={label} className="border-b border-slate-100 px-4 py-3 text-left">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/assessment/history/${row.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                      title="Klik untuk melihat detail assessment"
                    >
                      <td className="border-b border-slate-100 px-4 py-3 font-medium capitalize text-slate-800 transition-colors group-hover:text-blue-600">
                        {formatPersonName(row.driver)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">
                        {formatTrainingName(row.training)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-slate-500">{row.date}</td>
                      <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-800">{row.score.toFixed(1)}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <ResultBadge result={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="mb-5 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-red-500" />
                <h2 className="font-bold text-slate-900">{errorsTitle ?? 'Top 3 Poin Evaluasi Terbanyak'}</h2>
              </div>
              <Link href="/matrix" className="shrink-0 text-sm font-semibold text-blue-600 transition hover:text-blue-800">
                Detail Skill Matrix →
              </Link>
            </div>
            {improvementAreas.slice(0, 3).map((area) => (
              <div key={area.name} className="mb-5 rounded-lg p-2 transition hover:bg-slate-50">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{area.name}</span>
                  <span className="rounded-full border border-orange-200/60 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                    {area.count} temuan
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                    style={{ width: `${area.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </article>
        </section>
      </div>
    </AppShell>
  );
}
