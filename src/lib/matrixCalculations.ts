import type { MatrixStats, MatrixLevel } from '@/types/matrix';

/**
 * Logika Rekalkulasi Proporsional Matrix (Client & Server Safe):
 * - Rumus AVG: Total skor dari aspek yang terisi dibagi jumlah aspek yang bernilai (null/strip diabaikan).
 * - Mapping Level:
 *   * Hijau: AVG >= 3.0
 *   * Kuning: 2.0 <= AVG < 3.0
 *   * Merah: AVG < 2.0 (atau jika belum ada nilai valid)
 */
export function calculateMatrixStats(aspectScores: (number | null)[]): MatrixStats {
  const validScores = aspectScores.filter((s): s is number => s !== null && s !== undefined);
  if (validScores.length === 0) {
    return { avg: null, level: 'Belum Dinilai', validCount: 0 };
  }
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const avg = Number((sum / validScores.length).toFixed(1));

  let level: MatrixLevel = 'Merah';
  if (avg >= 3.0) {
    level = 'Hijau';
  } else if (avg >= 2.0) {
    level = 'Kuning';
  } else {
    level = 'Merah';
  }

  return { avg, level, validCount: validScores.length };
}
