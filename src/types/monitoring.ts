// ============================================================
// SLEC Monitoring – API Type Definitions
// ============================================================

export interface MonitoringFilters {
  from?: string;
  to?: string;
  assessmentType?: string;
}

export interface MonitoringSummary {
  totalAssessments: number;
  passCount: number;
  failCount: number;
  disqualifiedCount: number;
  passRate: number;
  failRate: number;
  averageScore: number;
}

export interface MonitoringTrendItem {
  month: string;
  total: number;
  pass: number;
  fail: number;
  averageScore: number;
}

export interface ResultDistributionItem {
  name: string;
  value: number;
}

export interface AssessmentTypeDistributionItem {
  name: string;
  value: number;
}

export interface ScoreDistributionItem {
  name: string;
  value: number;
}

export interface ParticipantPerformanceItem {
  participantName: string;
  totalAssessments: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  passRate: number;
  latestAssessmentDate: string;
}

export interface InstructorPerformanceItem {
  instructor: string;
  totalAssessments: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  passRate: number;
}

export interface LocationPerformanceItem {
  location: string;
  totalAssessments: number;
  passCount: number;
  failCount: number;
  averageScore: number;
  passRate: number;
}

export interface MonitoringResponse {
  success: boolean;
  filters: MonitoringFilters;
  summary: MonitoringSummary;
  trend: MonitoringTrendItem[];
  resultDistribution: ResultDistributionItem[];
  assessmentTypeDistribution: AssessmentTypeDistributionItem[];
  scoreDistribution: ScoreDistributionItem[];
  participantPerformance: ParticipantPerformanceItem[];
  instructorPerformance: InstructorPerformanceItem[];
  locationPerformance: LocationPerformanceItem[];
}
