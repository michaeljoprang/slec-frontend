import fs from 'fs';
import path from 'path';
import type { MatrixDriver, MatrixOverrideRecord } from '@/types/matrix';
import { calculateMatrixStats } from './matrixCalculations';

const DATA_DIR = path.join(process.cwd(), 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'matrix-overrides.json');

/**
 * Membaca semua record override yang tersimpan di file storage.
 * HANYA DIGUNAKAN DI SERVER / API ROUTE.
 */
export function getMatrixOverrides(): Record<string, MatrixOverrideRecord> {
  try {
    if (!fs.existsSync(OVERRIDES_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('[matrixStorage] Gagal membaca matrix overrides:', error);
    return {};
  }
}

/**
 * Menyimpan atau memperbarui data override matrix seorang driver.
 * HANYA DIGUNAKAN DI SERVER / API ROUTE.
 */
export function saveMatrixOverride(override: MatrixOverrideRecord): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = getMatrixOverrides();

    // Simpan berdasarkan driverId
    current[override.driverId] = override;

    // Simpan juga alias nama ter-normalisasi agar sinkron
    if (override.driverName) {
      const nameKey = `name:${override.driverName.trim().toLowerCase()}`;
      current[nameKey] = override;
    }

    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (error) {
    console.error('[matrixStorage] Gagal menyimpan matrix override:', error);
    throw error;
  }
}

/**
 * Mengaplikasikan data override ke daftar driver.
 * HANYA DIGUNAKAN DI SERVER / API ROUTE.
 */
export function applyMatrixOverrides(drivers: MatrixDriver[]): MatrixDriver[] {
  const overrides = getMatrixOverrides();

  return drivers.map((driver) => {
    const driverId = driver.id || '';
    const nameKey = `name:${(driver.name || '').trim().toLowerCase()}`;
    const override = overrides[driverId] || overrides[nameKey];

    if (!override) {
      return driver;
    }

    const aspectScores = override.aspectScores;
    const stats = calculateMatrixStats(aspectScores);

    return {
      ...driver,
      aspectScores,
      level: stats.level,
      score: driver.score,
      notes: override.notes !== undefined ? override.notes : driver.notes,
      drivingNotes: override.drivingNotes !== undefined ? override.drivingNotes : driver.drivingNotes,
      forkliftNotes: override.forkliftNotes !== undefined ? override.forkliftNotes : driver.forkliftNotes,
    };
  });
}
