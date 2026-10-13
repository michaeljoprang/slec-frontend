// ============================================================
// SLEC Dashboard – Realistic Mock Data for SLEC Domain
// ============================================================

import type {
  KpiItem,
  AssessmentTrendData,
  DistributionData,
  DriverPerformanceRow,
  RecentAssessmentRow,
} from '@/types';

// ---- KPI Cards ----

export const kpiData: KpiItem[] = [
  {
    id: 'total-assessments',
    label: 'Total Assessments',
    value: 1245,
    change: 8.4,
    changeDirection: 'up',
    intent: 'info',
    icon: 'ClipboardCheck',
  },
  {
    id: 'pass-rate',
    label: 'Pass Rate',
    value: '82%',
    change: 2.1,
    changeDirection: 'up',
    intent: 'success',
    icon: 'TrendingUp',
  },
  {
    id: 'fail-rate',
    label: 'Fail Rate',
    value: '18%',
    change: -2.1,
    changeDirection: 'down',
    intent: 'success', // less failure is success
    icon: 'TrendingDown',
  },
  {
    id: 'average-score',
    label: 'Average Score',
    value: 84.5,
    change: 1.2,
    changeDirection: 'up',
    intent: 'success',
    icon: 'CheckCircle',
  },
  {
    id: 'assessments-month',
    label: 'Assessments This Month',
    value: 184,
    change: 12,
    changeDirection: 'up',
    intent: 'info',
    icon: 'ClipboardCheck',
  },
];

// ---- Assessment Trend ----

export const assessmentTrendData: AssessmentTrendData = {
  assessments: [
    { date: '2026-04', value: 145 },
    { date: '2026-05', value: 160 },
    { date: '2026-06', value: 152 },
    { date: '2026-07', value: 180 },
    { date: '2026-08', value: 195 },
    { date: '2026-09', value: 184 },
  ],
};

// ---- Assessment Result (Pass/Fail) ----

export const assessmentResultData: DistributionData = {
  data: [
    { name: 'PASS', value: 1021, color: '#10b981' }, // success
    { name: 'FAIL', value: 224, color: '#ef4444' }, // danger
  ],
};

// ---- Assessment Type ----

export const assessmentTypeData: DistributionData = {
  data: [
    { name: 'Truck Assessment DDT', value: 890, color: '#3b82f6' }, // primary
    { name: 'Forklift Operation', value: 355, color: '#8b5cf6' }, // another color
  ],
};

// ---- Score Distribution ----

export const scoreDistributionData: DistributionData = {
  data: [
    { name: '< 60', value: 50, color: '#ef4444' },
    { name: '60–69', value: 174, color: '#f59e0b' },
    { name: '70–79', value: 420, color: '#10b981' }, // >= 70 is PASS
    { name: '80–89', value: 395, color: '#3b82f6' },
    { name: '90–100', value: 206, color: '#8b5cf6' },
  ],
};

// ---- Driver Performance ----

export const driverPerformanceData: DriverPerformanceRow[] = [
  {
    id: 'drv-01',
    driverName: 'Budi Santoso',
    assessmentsCount: 8,
    averageScore: 88.5,
    passRate: 100,
    status: 'Good',
  },
  {
    id: 'drv-02',
    driverName: 'Ahmad Fauzi',
    assessmentsCount: 5,
    averageScore: 92.0,
    passRate: 100,
    status: 'Good',
  },
  {
    id: 'drv-03',
    driverName: 'Rizal Pratama',
    assessmentsCount: 6,
    averageScore: 68.5,
    passRate: 50,
    status: 'Needs Improvement',
  },
  {
    id: 'drv-04',
    driverName: 'Siti Nurhaliza',
    assessmentsCount: 4,
    averageScore: 81.0,
    passRate: 75,
    status: 'Good',
  },
  {
    id: 'drv-05',
    driverName: 'Dewi Lestari',
    assessmentsCount: 7,
    averageScore: 65.0,
    passRate: 28,
    status: 'Needs Improvement',
  },
];

// ---- Recent Assessments ----

export const recentAssessmentsData: RecentAssessmentRow[] = [
  {
    id: 'asm-001',
    date: '2026-10-07',
    driverName: 'Budi Santoso',
    assessmentType: 'Truck Assessment DDT',
    location: 'Jakarta',
    score: 86,
    result: 'PASS',
  },
  {
    id: 'asm-002',
    date: '2026-10-06',
    driverName: 'Rina Wulandari',
    assessmentType: 'Truck Assessment DDT',
    location: 'Surabaya',
    score: 92,
    result: 'PASS',
  },
  {
    id: 'asm-003',
    date: '2026-10-06',
    driverName: 'Rizal Pratama',
    assessmentType: 'Truck Assessment DDT',
    location: 'Bandung',
    score: 64,
    result: 'FAIL',
  },
  {
    id: 'asm-004',
    date: '2026-10-05',
    driverName: 'Ahmad Fauzi',
    assessmentType: 'Forklift Operation',
    location: 'Semarang',
    score: 88,
    result: 'PASS',
  },
  {
    id: 'asm-005',
    date: '2026-10-04',
    driverName: 'Dewi Lestari',
    assessmentType: 'Truck Assessment DDT',
    location: 'Jakarta',
    score: 68,
    result: 'FAIL',
  },
];
