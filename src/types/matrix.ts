export type MatrixLevel = 'Hijau' | 'Kuning' | 'Merah' | 'Belum Dinilai';

export interface MatrixDriver {
  id?: string;
  name: string;
  level: string;
  training?: string;
  score?: number;
  aspectScores?: (number | null)[];
  notes?: string;
  drivingNotes?: string;
  forkliftNotes?: string;
}

export interface MatrixOverrideRecord {
  driverId: string;
  driverName?: string;
  aspectScores: (number | null)[];
  avg: number | null;
  level: MatrixLevel;
  notes?: string;
  drivingNotes?: string;
  forkliftNotes?: string;
  updatedAt?: string;
}

export interface MatrixStats {
  avg: number | null;
  level: MatrixLevel;
  validCount: number;
}
