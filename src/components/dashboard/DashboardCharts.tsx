'use client';

import { Box, Paper, Typography } from '@mui/material';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tokens } from '@/lib/themeTokens';

interface Props {
  trend: { month: string; pass: number; fail: number }[];
  distribution: { name: string; value: number; color: string }[];
}

export default function DashboardCharts({ trend, distribution }: Props) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' }, gap: 2.5, mb: 3.5 }}>
      <Paper sx={{ p: 3, height: 370, borderRadius: 3, boxShadow: '0 4px 18px rgba(15, 23, 42, .05)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: .5 }}>Tren Assessment 6 Bulan Terakhir</Typography>
        <Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mb: 2 }}>Perbandingan hasil lulus dan gagal</Typography>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <defs><linearGradient id="passFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={tokens.colors.status.success} stopOpacity={.28} /><stop offset="95%" stopColor={tokens.colors.status.success} stopOpacity={0} /></linearGradient><linearGradient id="failFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={tokens.colors.status.danger} stopOpacity={.2} /><stop offset="95%" stopColor={tokens.colors.status.danger} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.colors.borderLight} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: tokens.colors.text.secondary }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: tokens.colors.text.secondary }} /><Tooltip /><Legend />
              <Area type="monotone" dataKey="pass" name="LULUS" stroke={tokens.colors.status.success} fill="url(#passFill)" strokeWidth={2.5} /><Area type="monotone" dataKey="fail" name="GAGAL" stroke={tokens.colors.status.danger} fill="url(#failFill)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, height: 370, borderRadius: 3, boxShadow: '0 4px 18px rgba(15, 23, 42, .05)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: .5 }}>Rasio Kelulusan</Typography><Typography variant="body2" sx={{ color: tokens.colors.text.tertiary, mb: 1 }}>Distribusi hasil assessment</Typography>
        <Box sx={{ height: 285 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="78%" paddingAngle={3}>{distribution.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer></Box>
      </Paper>
    </Box>
  );
}
