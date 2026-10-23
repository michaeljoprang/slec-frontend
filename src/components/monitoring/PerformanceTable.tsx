'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Download, Gauge, Search, X } from 'lucide-react';
import { exportToCSV } from '@/lib/export';

type MonitoringRow = {
  id: string;
  docNumber?: string;
  driver: string;
  nik: string;
  program: string;
  instructor: string;
  completedAt: string;
  score: number;
  status: 'PASS' | 'FAIL';
  notes?: string;
};

export default function PerformanceTable({ rows }: { rows: MonitoringRow[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [program, setProgram] = useState('ALL');
  const [time, setTime] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MonitoringRow | null>(null);
  const pageSize = 10;

  const filtered = useMemo(() => rows.filter(row => {
    const query = search.toLowerCase();
    const date = new Date(row.completedAt);
    const now = new Date();
    const days = time === 'TODAY' ? 1 : time === 'WEEK' ? 7 : time === 'MONTH' ? 30 : 0;
    const withinTime = !days || (now.getTime() - date.getTime()) <= days * 86400000;
    return (
      (!query || [row.driver, row.nik, row.instructor, row.docNumber || '', row.id].some(value => value.toLowerCase().includes(query))) &&
      (status === 'ALL' || row.status === status) &&
      (program === 'ALL' || row.program === program) &&
      withinTime
    );
  }), [rows, search, status, program, time]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const reset = (setter: () => void) => { setter(); setPage(1); };

  const passCount = rows.filter(row => row.status === 'PASS' && row.score >= 80).length;
  const failCount = rows.length - passCount;
  const average = rows.length ? rows.reduce((sum, row) => sum + row.score, 0) / rows.length : 0;

  const exportData = () => exportToCSV(
    'monitoring-operasional.csv',
    filtered.map(row => ({
      'No. Dokumen': row.docNumber || row.id,
      Driver: row.driver,
      NIK: row.nik,
      Program: row.program,
      Instruktur: row.instructor,
      Skor: row.score.toFixed(1),
      Status: row.status
    })),
    ['No. Dokumen', 'Driver', 'NIK', 'Program', 'Instruktur', 'Skor', 'Status']
  );

  const programClass = (value: string) =>
    value === 'DDT'
      ? 'border border-indigo-200/60 bg-indigo-50 text-indigo-700'
      : value === 'Refreshment'
      ? 'border border-amber-200/60 bg-amber-50 text-amber-700'
      : 'border border-sky-200/60 bg-sky-50 text-sky-700';

  return (
    <main className="min-h-screen space-y-6 bg-slate-50 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Monitoring Operasional</h1>
          <p className="mt-1 text-sm text-slate-500">Pantau status assessment dan performa pengemudi secara terpusat.</p>
        </div>
        <button
          onClick={exportData}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <Download size={16} /> Export Data CSV
        </button>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'TOTAL EVALUASI', value: rows.length, icon: ClipboardList, color: 'text-slate-900' },
          { label: 'SIAP OPERASI (PASS)', value: `${passCount} (${rows.length ? Math.round(passCount / rows.length * 100) : 0}%)`, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'PERLU RETRAINING (FAIL)', value: failCount, icon: AlertTriangle, color: 'text-rose-600' },
          { label: 'RATA-RATA SKOR', value: average.toFixed(1), icon: Gauge, color: 'text-indigo-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold tracking-wide text-slate-500">{label}</p>
              <span className="rounded-lg bg-slate-50 p-2"><Icon size={19} className={color} /></span>
            </div>
            <p className={`mt-3 text-2xl font-extrabold ${color}`}>{value}</p>
          </article>
        ))}
      </section>

      <section className="mb-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row">
        <label className="relative w-full flex-1">
          <Search size={17} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={event => reset(() => setSearch(event.target.value))}
            placeholder="Cari nama driver, no. dokumen, NIK, atau instruktur..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <select value={status} onChange={event => reset(() => setStatus(event.target.value))} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-medium text-slate-700">
            <option value="ALL">Semua Status</option>
            <option value="PASS">PASS</option>
            <option value="FAIL">FAIL</option>
          </select>
          <select value={program} onChange={event => reset(() => setProgram(event.target.value))} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-medium text-slate-700">
            <option value="ALL">Semua Program</option>
            <option>DDT</option>
            <option>Refreshment</option>
            <option>Standard</option>
          </select>
          <select value={time} onChange={event => reset(() => setTime(event.target.value))} className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-medium text-slate-700">
            <option value="ALL">Semua Waktu</option>
            <option value="TODAY">Hari Ini</option>
            <option value="WEEK">7 Hari Terakhir</option>
            <option value="MONTH">30 Hari Terakhir</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {['No. Dokumen & Waktu', 'Nama Driver', 'Program', 'Instruktur', 'Skor', 'Status', 'Catatan Trainer', 'Aksi'].map(header => (
                  <th key={header} className="px-4 py-3 text-left">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => (
                <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-left">
                    <span className="block text-xs font-medium text-slate-500">
                      {new Date(row.completedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span
                      className="mt-1 inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 tracking-tight"
                      title={row.docNumber || row.id}
                    >
                      {row.docNumber || row.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <b className="capitalize text-sm text-slate-800">{row.driver}</b>
                    <small className="block text-slate-500">{row.nik || 'Driver Operasional'}</small>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${programClass(row.program)}`}>
                      {row.program}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize text-slate-700">{row.instructor}</td>
                  <td className="px-4 py-3 text-left">
                    <span className="text-sm font-semibold text-slate-800">
                      {row.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.status === 'PASS' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${row.status === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={row.notes || undefined}>
                    {row.notes || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(row)}
                      className="rounded-lg bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100/80 hover:text-blue-800"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          Menampilkan {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} dari {filtered.length} data
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sebelumnya</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => (
              <button key={number} onClick={() => setPage(number)} className={`h-8 w-8 rounded-lg ${page === number ? 'bg-blue-600 text-white' : 'border'}`}>
                {number}
              </button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Selanjutnya</button>
          </div>
        </footer>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={event => event.stopPropagation()}>
            <div className="flex justify-between">
              <h2 className="text-lg font-bold text-slate-900">Ringkasan Evaluasi</h2>
              <button onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <p className="mt-4 font-semibold">{selected.driver}</p>
            <p className="text-sm text-slate-500">{selected.docNumber || selected.id} · Skor {selected.score.toFixed(1)} · {selected.status}</p>
            <p className="mt-4 text-sm text-slate-600">
              Rekomendasi: {selected.status === 'PASS' ? 'Pertahankan kompetensi dan lakukan pemantauan berkala.' : 'Wajib retraining dan evaluasi ulang sebelum beroperasi.'}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
