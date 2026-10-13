'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Box, Typography, Grid, Card, CardContent, Skeleton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Chip, Divider,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ClipboardCheck, TrendingUp, TrendingDown, Star,
  Eye, AlertTriangle, ArrowRight,
} from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import ResultBadge from '@/components/common/ResultBadge';
import { tokens } from '@/lib/theme';
import { getAssessmentDisplayName } from '@/lib/assessment';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
interface Assessment {
  id: string;
  assessmentType: string;
  assessmentDate: string;
  participantName: string;
  vehicleType: string;
  licensePlate: string;
  testLocation: string;
  instructor: string;
  score: number | string;
  result: string;
  createdAt: string;
}

interface KPI {
  id: string;
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */
const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

/* ------------------------------------------------------------------ */
/* Custom Pie Label                                                      */
/* ------------------------------------------------------------------ */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={13} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ------------------------------------------------------------------ */
/* KPI Card                                                              */
/* ------------------------------------------------------------------ */
function KpiCard({ kpi, loading }: { kpi: KPI; loading: boolean }) {
  return (
    <Card sx={{
      borderRadius: `${tokens.borderRadius.lg}px`,
      border: `1px solid ${kpi.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        bgcolor: kpi.color,
        background: kpi.color,
      },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
            {kpi.label}
          </Typography>
          <Box sx={{ p: 1, borderRadius: `${tokens.borderRadius.sm}px`, bgcolor: kpi.bg, color: kpi.color, display: 'flex' }}>
            {kpi.icon}
          </Box>
        </Box>
        {loading ? (
          <Skeleton variant="text" width={90} height={56} />
        ) : (
          <>
            <Typography variant="h3" sx={{ fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}
            </Typography>
            {kpi.sub && (
              <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary, mt: 0.5, display: 'block' }}>
                {kpi.sub}
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const [rows, setRows] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assessments', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const data: Assessment[] = j.data || j || [];
        setRows(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ---- Derived KPIs ---- */
  const kpis = useMemo<KPI[]>(() => {
    const total = rows.length;
    const passCount = rows.filter(r => r.result === 'PASS').length;
    const failCount = rows.filter(r => r.result === 'FAIL').length;
    const disqCount = rows.filter(r => r.result === 'DISQUALIFIED').length;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;
    const avgScore = total > 0
      ? (rows.reduce((acc, r) => acc + Number(r.score || 0), 0) / total).toFixed(1)
      : '—';
    const criticalFails = failCount + disqCount;

    return [
      {
        id: 'total',
        label: 'Total Assessments',
        value: total,
        sub: 'Seluruh assessment tersimpan',
        icon: <ClipboardCheck size={18} />,
        color: tokens.colors.primaryLight,
        bg: tokens.colors.status.infoBg,
        border: '#bfdbfe',
      },
      {
        id: 'pass-rate',
        label: 'Overall Pass Rate',
        value: `${passRate}%`,
        sub: `${passCount} lulus dari ${total} peserta`,
        icon: <TrendingUp size={18} />,
        color: passRate >= 70 ? tokens.colors.status.success : tokens.colors.status.warning,
        bg: passRate >= 70 ? tokens.colors.status.successBg : tokens.colors.status.warningBg,
        border: passRate >= 70 ? '#a7f3d0' : '#fde68a',
      },
      {
        id: 'avg-score',
        label: 'Average Score',
        value: avgScore,
        sub: 'Rata-rata nilai keseluruhan',
        icon: <Star size={18} />,
        color: tokens.colors.secondary,
        bg: '#ccfbf1',
        border: '#99f6e4',
      },
      {
        id: 'critical-fails',
        label: 'Critical Fails',
        value: criticalFails,
        sub: `${failCount} FAIL · ${disqCount} DISQUALIFIED`,
        icon: <AlertTriangle size={18} />,
        color: criticalFails === 0 ? tokens.colors.status.success : tokens.colors.status.danger,
        bg: criticalFails === 0 ? tokens.colors.status.successBg : tokens.colors.status.dangerBg,
        border: criticalFails === 0 ? '#a7f3d0' : '#fca5a5',
      },
    ];
  }, [rows]);

  /* ---- Recent 5 ---- */
  const recentRows = useMemo(() => {
    return [...rows]
      .sort((a, b) => new Date(b.createdAt || b.assessmentDate).getTime() - new Date(a.createdAt || a.assessmentDate).getTime())
      .slice(0, 5);
  }, [rows]);

  /* ---- Pie: Pass / Fail / Disqualified ---- */
  const pieData = useMemo(() => {
    const pass = rows.filter(r => r.result === 'PASS').length;
    const fail = rows.filter(r => r.result === 'FAIL').length;
    const disq = rows.filter(r => r.result === 'DISQUALIFIED').length;
    return [
      { name: 'Pass', value: pass, color: tokens.colors.status.success },
      { name: 'Fail', value: fail, color: tokens.colors.status.danger },
      { name: 'Disqualified', value: disq, color: tokens.colors.status.warning },
    ].filter(d => d.value > 0);
  }, [rows]);

  /* ---- Bar: By Assessment Type ---- */
  const typeBarData = useMemo(() => {
    const map: Record<string, { pass: number; fail: number }> = {};
    rows.forEach(r => {
      const key = getAssessmentDisplayName(r.assessmentType);
      if (!map[key]) map[key] = { pass: 0, fail: 0 };
      if (r.result === 'PASS') map[key].pass++;
      else map[key].fail++;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [rows]);

  const hasData = rows.length > 0;

  return (
    <AppShell pageTitle="Dashboard Overview">
      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>

        {/* ---- Header ---- */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: tokens.colors.text.primary, lineHeight: 1.2 }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.colors.text.secondary, mt: 0.5 }}>
              Ringkasan metrik dan aktivitas assessment terkini.
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: tokens.colors.text.tertiary, fontStyle: 'italic' }}>
            Data langsung dari database · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </Typography>
        </Box>

        {/* ---- KPI Cards ---- */}
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          {kpis.map(kpi => (
            <Grid item xs={12} sm={6} lg={3} key={kpi.id}>
              <KpiCard kpi={kpi} loading={loading} />
            </Grid>
          ))}
        </Grid>

        {/* ---- Charts Row ---- */}
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          {/* Pie Chart */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: `${tokens.borderRadius.lg}px`, border: `1px solid ${tokens.colors.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary, mb: 2 }}>
                Distribusi Hasil
              </Typography>
              <Box sx={{ height: 280 }}>
                {loading ? (
                  <Skeleton variant="circular" width={220} height={220} sx={{ mx: 'auto' }} />
                ) : !hasData ? (
                  <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary }}>Belum ada data assessment</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={110}
                        innerRadius={65}
                        paddingAngle={3}
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.colors.border}`, fontSize: 13 }}
                        formatter={(v: any, name: any) => [`${v} peserta`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
              {/* Legend */}
              {!loading && hasData && (
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1, flexWrap: 'wrap' }}>
                  {pieData.map(d => (
                    <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                      <Typography variant="caption" sx={{ color: tokens.colors.text.secondary, fontWeight: 600 }}>
                        {d.name} ({d.value})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Bar Chart */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: `${tokens.borderRadius.lg}px`, border: `1px solid ${tokens.colors.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary, mb: 2 }}>
                Assessment per Jenis
              </Typography>
              <Box sx={{ height: 280 }}>
                {loading ? (
                  <Skeleton variant="rounded" width="100%" height="100%" />
                ) : !hasData ? (
                  <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary }}>Belum ada data assessment</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.border} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: tokens.colors.text.secondary }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: tokens.colors.text.secondary }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.colors.border}`, fontSize: 13 }}
                        cursor={{ fill: tokens.colors.surfaceHover }}
                      />
                      <Bar dataKey="pass" name="Pass" fill={tokens.colors.status.success} radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="fail" name="Fail" fill={tokens.colors.status.danger} radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ---- Recent Activity Table ---- */}
        <Paper sx={{ borderRadius: `${tokens.borderRadius.lg}px`, border: `1px solid ${tokens.colors.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${tokens.colors.border}` }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.colors.text.primary }}>
              Aktivitas Terbaru
            </Typography>
            <Tooltip title="Lihat semua riwayat">
              <Link href="/assessment/history" style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.colors.primaryLight, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Lihat Semua <ArrowRight size={14} />
              </Link>
            </Tooltip>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.colors.surface }}>
                  {['Tanggal', 'Peserta', 'Jenis Assessment', 'Kendaraan', 'Score', 'Hasil', 'Detail'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600, color: tokens.colors.text.secondary, fontSize: '0.78rem', py: 1.5 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton variant="text" width={80} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : recentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary }}>
                        Belum ada data assessment.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRows.map(row => {
                    const scoreNum = Number(row.score || 0);
                    const scoreColor = scoreNum >= 70 ? tokens.colors.status.success : tokens.colors.status.danger;
                    return (
                      <TableRow key={row.id} sx={{ '&:last-child td': { border: 0 }, '&:hover': { bgcolor: tokens.colors.surfaceHover }, transition: 'background 0.15s' }}>
                        <TableCell sx={{ color: tokens.colors.text.secondary, whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                          {formatDate(row.assessmentDate || row.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.colors.text.primary }}>
                            {row.participantName || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getAssessmentDisplayName(row.assessmentType)}
                            size="small"
                            sx={{ bgcolor: tokens.colors.status.infoBg, color: tokens.colors.status.info, fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: tokens.colors.text.secondary, fontSize: '0.82rem' }}>
                          {row.vehicleType || '—'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: scoreColor }}>
                            {scoreNum.toFixed(1)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <ResultBadge result={(row.result === 'DISQUALIFIED' ? 'FAIL' : row.result) as 'PASS' | 'FAIL'} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Lihat Detail">
                            <Link href={`/assessment/history/${row.id}`} passHref>
                              <IconButton size="small" sx={{ color: tokens.colors.primaryLight }}>
                                <Eye size={16} />
                              </IconButton>
                            </Link>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Box>
    </AppShell>
  );
}
