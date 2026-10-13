'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Box, Grid, Alert, Paper, Typography } from '@mui/material';
import AppShell from '@/components/layout/AppShell';
import KpiCard from '@/components/dashboard/KpiCard';
import DistributionChart from '@/components/dashboard/DistributionChart';
import MonitoringFilterBar from '@/components/monitoring/MonitoringFilterBar';
import MonitoringTrendChart from '@/components/monitoring/MonitoringTrendChart';
import PerformanceTable from '@/components/monitoring/PerformanceTable';
import {
  MonitoringKpiSkeleton,
  MonitoringChartSkeleton,
  MonitoringTableSkeleton,
} from '@/components/monitoring/MonitoringSkeletons';
import { tokens } from '@/lib/theme';
import { getAssessmentDisplayName } from '@/lib/assessment';
import type { MonitoringResponse, MonitoringFilters } from '@/types/monitoring';
import type { KpiItem, DistributionData } from '@/types';

// Map colors based on existing themes
const RESULT_COLORS: Record<string, string> = {
  PASS: tokens.colors.status.success as string,
  FAIL: tokens.colors.status.danger as string,
  DISQUALIFIED: tokens.colors.status.warning as string,
};

const SCORE_COLORS: Record<string, string> = {
  '<60': tokens.colors.status.danger as string,
  '60-69': tokens.colors.status.warning as string,
  '70-79': tokens.colors.status.success as string,
  '80-89': tokens.colors.status.info as string,
  '90-100': '#8b5cf6',
};

const TYPE_PALETTE = [tokens.colors.status.info, '#8b5cf6', '#f59e0b', tokens.colors.secondary];

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MonitoringFilters>({ assessmentType: 'ALL' });

  const loadData = useCallback(async (currentFilters: MonitoringFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/assessments');
      if (!res.ok) throw new Error('Failed to fetch data');
      const parsed: any = await res.json();
      
      let filtered: any[] = Array.isArray(parsed) ? parsed : (parsed?.data || []);
      if (currentFilters.assessmentType && currentFilters.assessmentType !== 'ALL') {
        filtered = filtered.filter((a: any) => {
          if (currentFilters.assessmentType === 'TMMIN') {
            return a.assessmentType === 'TMMIN' || a.assessmentType === 'TMMIN_STANDARD' || a.assessmentType === 'TMMIN_REFRESHMENT' || (a.assessmentType || '').toLowerCase().includes('forklift');
          }
          return a.assessmentType === currentFilters.assessmentType;
        });
      }
      if (currentFilters.from) {
        filtered = filtered.filter((a: any) => {
          const dtStr = (a.assessmentDate || a.createdAt || '').slice(0, 10);
          return dtStr >= currentFilters.from!;
        });
      }
      if (currentFilters.trainingProgram && currentFilters.trainingProgram !== 'ALL') {
        filtered = filtered.filter((a: any) => a.trainingProgram === currentFilters.trainingProgram);
      }
      if (currentFilters.to) {
        filtered = filtered.filter((a: any) => {
          const dtStr = (a.assessmentDate || a.createdAt || '').slice(0, 10);
          return dtStr <= currentFilters.to!;
        });
      }

      const passCount = filtered.filter((a: any) => {
        const resStr = (a.result || '').toUpperCase();
        return resStr === 'PASS' || resStr === 'LULUS';
      }).length;
      const disqualifiedCount = filtered.filter((a: any) => (a.result || '').toUpperCase() === 'DISQUALIFIED').length;
      const failCount = filtered.length - passCount - disqualifiedCount;
      const passRate = filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0;
      const failRate = filtered.length > 0 ? Math.round(((failCount + disqualifiedCount) / filtered.length) * 100) : 0;
      const avgScore = filtered.length > 0 ? filtered.reduce((acc: number, a: any) => acc + Number(a.score || 0), 0) / filtered.length : 0;
      
      // Grouping logic
      const trendMap: Record<string, { month: string; pass: number; fail: number; averageScore: number; total: number }> = {};
      const scoreDistMap = { '<60': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
      const typeDistMap: Record<string, number> = {};
      const participantMap: Record<string, any> = {};
      const instructorMap: Record<string, any> = {};
      const locationMap: Record<string, any> = {};

      filtered.forEach((a: any) => {
        // Trend
        const dateStr = new Date(a.assessmentDate || a.createdAt).toISOString().split('T')[0];
        const month = dateStr.substring(0, 7); // YYYY-MM
        if (!trendMap[month]) trendMap[month] = { month, pass: 0, fail: 0, averageScore: 0, total: 0 };
        trendMap[month].total += 1;
        trendMap[month].averageScore += Number(a.score || 0);
        const isPass = (a.result || '').toUpperCase() === 'PASS';
        if (isPass) trendMap[month].pass += 1;
        else trendMap[month].fail += 1;

        // Score Dist
        const score = Number(a.score || 0);
        if (score < 60) scoreDistMap['<60']++;
        else if (score < 70) scoreDistMap['60-69']++;
        else if (score < 80) scoreDistMap['70-79']++;
        else if (score < 90) scoreDistMap['80-89']++;
        else scoreDistMap['90-100']++;

        // Type Dist
        const type = a.assessmentType || 'DDT';
        typeDistMap[type] = (typeDistMap[type] || 0) + 1;

        // Participant Performance
        const pName = a.participantName || 'Unknown';
        if (!participantMap[pName]) participantMap[pName] = { id: pName, name: pName, role: 'Participant', totalAssessments: 0, passed: 0, averageScore: 0 };
        participantMap[pName].totalAssessments++;
        participantMap[pName].averageScore += score;
        if ((a.result || '').toUpperCase() === 'PASS') participantMap[pName].passed++;

        // Instructor Performance
        const iName = a.instructor || 'Unknown';
        if (!instructorMap[iName]) instructorMap[iName] = { id: iName, name: iName, role: 'Instructor', totalAssessments: 0, passed: 0, averageScore: 0 };
        instructorMap[iName].totalAssessments++;
        instructorMap[iName].averageScore += score;
        if ((a.result || '').toUpperCase() === 'PASS') instructorMap[iName].passed++;

        // Location Performance
        const lName = a.testLocation || 'Unknown';
        if (!locationMap[lName]) locationMap[lName] = { id: lName, name: lName, role: 'Location', totalAssessments: 0, passed: 0, averageScore: 0 };
        locationMap[lName].totalAssessments++;
        locationMap[lName].averageScore += score;
        if ((a.result || '').toUpperCase() === 'PASS') locationMap[lName].passed++;
      });

      // Finalize maps
      const trend = Object.values(trendMap).map(t => ({ ...t, averageScore: Math.round(t.averageScore / t.total) })).sort((a, b) => a.month.localeCompare(b.month));
      const scoreDistribution = Object.entries(scoreDistMap).map(([name, value]) => ({ name, value }));
      const assessmentTypeDistribution = Object.entries(typeDistMap).map(([name, value]) => ({ name, value }));
      
      const finalizePerformance = (map: Record<string, any>) => Object.values(map).map(p => ({
        ...p,
        passCount: p.passed,
        failCount: p.totalAssessments - p.passed,
        averageScore: Math.round(p.averageScore / p.totalAssessments),
        passRate: Math.round((p.passed / p.totalAssessments) * 100),
      })).sort((a, b) => b.totalAssessments - a.totalAssessments);

      const responseData: MonitoringResponse = {
        success: true,
        filters: currentFilters,
        summary: {
          totalAssessments: filtered.length,
          passRate,
          averageScore: avgScore,
          failCount,
          passCount,
          disqualifiedCount,
          failRate,
        },
        trend,
        resultDistribution: [
          { name: 'PASS', value: passCount },
          { name: 'FAIL', value: failCount },
          { name: 'DISQUALIFIED', value: disqualifiedCount }
        ].filter(d => d.value > 0),
        scoreDistribution,
        assessmentTypeDistribution,
        participantPerformance: finalizePerformance(participantMap),
        instructorPerformance: finalizePerformance(instructorMap),
        locationPerformance: finalizePerformance(locationMap)
      };
      
      setData(responseData);
    } catch (err: any) {
      setError(err.message || 'Unable to load monitoring data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  const handleApplyFilter = (newFilters: MonitoringFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilter = () => {
    setFilters({ assessmentType: 'ALL' });
  };

  // ---- Derived Data for Components ----

  const getKpis = (): KpiItem[] => {
    if (!data) return [];
    const { summary } = data;
    return [
      {
        id: 'total-assessments',
        label: 'Total Assessments',
        value: summary.totalAssessments,
        intent: 'info',
        icon: 'ClipboardCheck',
      },
      {
        id: 'pass-rate',
        label: 'Pass Rate',
        value: `${summary.passRate}%`,
        intent: summary.passRate >= 70 ? 'success' : 'warning',
        icon: 'TrendingUp',
      },
      {
        id: 'average-score',
        label: 'Average Score',
        value: summary.averageScore > 0 ? summary.averageScore.toFixed(1) : '—',
        intent: summary.averageScore >= 70 ? 'success' : summary.totalAssessments === 0 ? 'neutral' : 'warning',
        icon: 'CheckCircle',
      },
      {
        id: 'fail-count',
        label: 'Fail Count',
        value: summary.failCount,
        intent: summary.failCount === 0 ? 'success' : 'danger',
        icon: 'TrendingDown',
      },
    ];
  };

  const getResultDistribution = (): DistributionData => {
    if (!data) return { data: [] };
    return {
      data: data.resultDistribution.map((item) => ({
        name: item.name,
        value: item.value,
        color: RESULT_COLORS[item.name] || tokens.colors.primary,
      })),
    };
  };

  const getScoreDistribution = (): DistributionData => {
    if (!data) return { data: [] };
    return {
      data: data.scoreDistribution.map((item) => ({
        name: item.name,
        value: item.value,
        color: SCORE_COLORS[item.name] || tokens.colors.primary,
      })),
    };
  };

  const getTypeDistribution = (): DistributionData => {
    if (!data) return { data: [] };
    return {
      data: data.assessmentTypeDistribution.map((item, index) => ({
        name: getAssessmentDisplayName(item.name),
        value: item.value,
        color: TYPE_PALETTE[index % TYPE_PALETTE.length],
      })),
    };
  };

  const kpis = getKpis();
  const resultDist = getResultDistribution();
  const scoreDist = getScoreDistribution();
  const typeDist = getTypeDistribution();
  
  const hasData = data && data.summary.totalAssessments > 0;
  const isSuccessEmpty = data && data.summary.totalAssessments === 0;

  return (
    <AppShell pageTitle="Monitoring">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="body2" sx={{ color: tokens.colors.text.secondary }}>
            Monitor assessment performance, results, and trends.
          </Typography>
        </Box>

        <MonitoringFilterBar
          initialFilters={filters}
          onApply={handleApplyFilter}
          onReset={handleResetFilter}
        />

        {error && (
          <Alert
            severity="error"
            action={
              <Box component="button" onClick={() => loadData(filters)} sx={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
                Retry
              </Box>
            }
          >
            {error}
          </Alert>
        )}

        {isSuccessEmpty && (
          <Paper sx={{ p: 6, textAlign: 'center', border: `2px dashed ${tokens.colors.border}`, bgcolor: tokens.colors.borderLight }}>
            <Typography variant="h5" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
              Tidak ada data untuk ditampilkan
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mt: 0.5 }}>
              Belum ada data assessment. Silakan lakukan assessment baru.
            </Typography>
          </Paper>
        )}

        {loading ? (
          <>
            <MonitoringKpiSkeleton />
            <Grid container spacing={2}>
              <Grid item xs={12} lg={8}>
                <MonitoringChartSkeleton />
              </Grid>
              <Grid item xs={12} lg={4}>
                <MonitoringChartSkeleton />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <MonitoringChartSkeleton height={300} />
              </Grid>
              <Grid item xs={12} lg={6}>
                <MonitoringChartSkeleton height={300} />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={4}>
                <MonitoringTableSkeleton />
              </Grid>
              <Grid item xs={12} lg={4}>
                <MonitoringTableSkeleton />
              </Grid>
              <Grid item xs={12} lg={4}>
                <MonitoringTableSkeleton />
              </Grid>
            </Grid>
          </>
        ) : hasData ? (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2}>
              {kpis.map((kpi) => (
                <Grid item xs={12} sm={6} md={3} key={kpi.id}>
                  <KpiCard data={kpi} />
                </Grid>
              ))}
            </Grid>

            {/* Row 2: Trend + Result Distribution */}
            <Grid container spacing={2}>
              <Grid item xs={12} lg={8}>
                <MonitoringTrendChart data={data.trend} />
              </Grid>
              <Grid item xs={12} lg={4}>
                <DistributionChart title="Result Distribution" data={resultDist} type="donut" />
              </Grid>
            </Grid>

            {/* Row 3: Assessment Type + Score Distribution */}
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <DistributionChart title="Score Distribution" data={scoreDist} type="pie" />
              </Grid>
              <Grid item xs={12} lg={6}>
                <DistributionChart title="Assessment by Type" data={typeDist} type="donut" />
              </Grid>
            </Grid>

            {/* Row 4: Performance Tables */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} lg={6}>
                <PerformanceTable
                  title="Participant Performance"
                  subtitle="Top participants based on assessment volume"
                  data={data.participantPerformance}
                  entityLabel="Participant"
                  entityKey="name"
                />
              </Grid>
              <Grid item xs={12} lg={6}>
                <PerformanceTable
                  title="Instructor Performance"
                  subtitle="Performance summary by instructor"
                  data={data.instructorPerformance}
                  entityLabel="Instructor"
                  entityKey="name"
                />
              </Grid>
              <Grid item xs={12}>
                <PerformanceTable
                  title="Location Performance"
                  subtitle="Assessment metrics by test location"
                  data={data.locationPerformance}
                  entityLabel="Location"
                  entityKey="name"
                />
              </Grid>
            </Grid>
          </>
        ) : null}
      </Box>
    </AppShell>
  );
}
