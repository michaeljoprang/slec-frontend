// ============================================================
// SLEC – Monitoring API Service
// ============================================================

import type { MonitoringFilters, MonitoringResponse } from '@/types/monitoring';

const API_BASE = 'http://localhost:5000/api';

export async function fetchMonitoringSummary(
  filters: MonitoringFilters = {},
): Promise<MonitoringResponse> {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.assessmentType) params.set('assessmentType', filters.assessmentType);

  const queryString = params.toString();
  const url = `${API_BASE}/monitoring/summary${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Monitoring API error: ${res.status} ${res.statusText}`);
  }

  const data: MonitoringResponse = await res.json();
  if (!data.success) {
    throw new Error('Monitoring API returned unsuccessful response');
  }
  return data;
}
