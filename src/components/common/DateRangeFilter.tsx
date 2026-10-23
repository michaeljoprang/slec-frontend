'use client';

import React from 'react';

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onReset?: () => void;
  className?: string;
  labelStart?: string;
  labelEnd?: string;
}

/**
 * Filter Rentang Tanggal Standar SLEC
 * Menyediakan dua input date berdampingan ("Awal Periode" & "Akhir Periode")
 * dan tombol "Reset Periode" jika salah satu tanggal terisi.
 */
export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  className = '',
  labelStart = 'Awal Periode',
  labelEnd = 'Akhir Periode',
}: DateRangeFilterProps) {
  const isFiltered = Boolean(startDate || endDate);

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onStartDateChange('');
      onEndDateChange('');
    }
  };

  return (
    <div className={`flex flex-wrap items-end gap-2.5 ${className}`}>
      {/* Input Awal Periode */}
      <div className="flex flex-col">
        <label className="mb-1 text-xs font-semibold text-slate-600">
          {labelStart}
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          aria-label={labelStart}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
        />
      </div>

      {/* Input Akhir Periode */}
      <div className="flex flex-col">
        <label className="mb-1 text-xs font-semibold text-slate-600">
          {labelEnd}
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          aria-label={labelEnd}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
        />
      </div>

      {/* Tombol Reset Periode (tampil jika salah satu tanggal terisi) */}
      {isFiltered && (
        <button
          type="button"
          onClick={handleReset}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition shadow-sm whitespace-nowrap"
        >
          Reset Periode
        </button>
      )}
    </div>
  );
}

/**
 * Helper untuk memeriksa apakah suatu tanggal masuk dalam rentang tanggal secara inklusif:
 * Mulai 00:00:00 pada Awal Periode hingga 23:59:59.999 pada Akhir Periode.
 */
export function isWithinDateRangeInclusive(
  dateValue?: string | Date | null,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true;
  if (!dateValue) return false;

  const itemDate = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(itemDate.getTime())) return false;

  if (startDate) {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    if (itemDate.getTime() < start.getTime()) return false;
  }

  if (endDate) {
    const [ey, em, ed] = endDate.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    if (itemDate.getTime() > end.getTime()) return false;
  }

  return true;
}
