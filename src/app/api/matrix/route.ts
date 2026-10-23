import { NextResponse } from 'next/server';
import { getMatrixOverrides, saveMatrixOverride } from '@/lib/matrixStorage';
import { calculateMatrixStats } from '@/lib/matrixCalculations';
import { getSkillMatrixData, fallbackDrivers } from '@/lib/matrixService';
import { cleanTrainerNotes } from '@/lib/utils';
import type { MatrixDriver, MatrixOverrideRecord } from '@/types/matrix';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSkillMatrixData();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GET /api/matrix] Error:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data matriks' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { driverId, driverName, aspectScores, notes, drivingNotes, forkliftNotes } = body;

    if (!driverId) {
      return NextResponse.json({ error: 'Field driverId wajib disertakan' }, { status: 400 });
    }

    if (!Array.isArray(aspectScores) || aspectScores.length !== 10) {
      return NextResponse.json(
        { error: 'aspectScores harus berupa array dengan 10 elemen (skala 0-4 atau null)' },
        { status: 400 }
      );
    }

    const sanitizedScores: (number | null)[] = aspectScores.map((score: any) => {
      if (score === null || score === undefined || score === '' || score === '—') {
        return null;
      }
      const num = Number(score);
      if (Number.isNaN(num) || num < 0 || num > 4) {
        return null;
      }
      return Math.round(num);
    });

    const { avg, level } = calculateMatrixStats(sanitizedScores);

    const effectiveDrivingNotes = typeof drivingNotes === 'string' && cleanTrainerNotes(drivingNotes) ? cleanTrainerNotes(drivingNotes) : undefined;
    const effectiveForkliftNotes = typeof forkliftNotes === 'string' && cleanTrainerNotes(forkliftNotes) ? cleanTrainerNotes(forkliftNotes) : undefined;

    let combinedNotes = typeof notes === 'string' && cleanTrainerNotes(notes) ? cleanTrainerNotes(notes) : undefined;
    if (effectiveDrivingNotes && effectiveForkliftNotes) {
      combinedNotes = `${effectiveDrivingNotes} • ${effectiveForkliftNotes}`;
    } else if (effectiveDrivingNotes) {
      combinedNotes = effectiveDrivingNotes;
    } else if (effectiveForkliftNotes) {
      combinedNotes = effectiveForkliftNotes;
    }

    const overrideRecord: MatrixOverrideRecord = {
      driverId,
      driverName: driverName || undefined,
      aspectScores: sanitizedScores,
      avg,
      level,
      notes: combinedNotes,
      drivingNotes: effectiveDrivingNotes,
      forkliftNotes: effectiveForkliftNotes,
      updatedAt: new Date().toISOString(),
    };

    saveMatrixOverride(overrideRecord);

    return NextResponse.json({
      success: true,
      message: 'Nilai matriks berhasil diperbarui',
      data: overrideRecord,
    });
  } catch (error: any) {
    console.error('[PUT /api/matrix] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan perubahan matrix' },
      { status: 500 }
    );
  }
}
