// ============================================================
// SLEC Dashboard – Core Type Definitions
// ============================================================

// ---- KPI ----

export interface KpiItem {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  /** Change compared to previous period – percentage */
  change?: number;
  /** Direction of the change */
  changeDirection?: 'up' | 'down' | 'neutral';
  /** Semantic intent for styling */
  intent?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: string; // Lucide icon name
}

// ---- Chart Data ----

export interface TimeSeriesDataPoint {
  date: string; // e.g. "2026-04", "2026-05"
  value: number;
  label?: string;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface AssessmentTrendData {
  assessments: TimeSeriesDataPoint[];
}

export interface DistributionData {
  data: CategoryDataPoint[];
}

// ---- Navigation ----

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: number;
}

// ---- Driver / Assessment Dashboard Data ----

export interface DriverPerformanceRow {
  id: string;
  driverName: string;
  assessmentsCount: number;
  averageScore: number;
  passRate: number; // percentage 0-100
  status: 'Good' | 'Needs Improvement';
}

export interface RecentAssessmentRow {
  id: string;
  date: string;
  driverName: string;
  assessmentType: string;
  location: string;
  score: number;
  result: 'PASS' | 'FAIL';
}
