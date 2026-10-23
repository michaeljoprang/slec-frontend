import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getMatrixOverrides,
  saveMatrixOverride,
} from '@/lib/matrixStorage';
import { calculateMatrixStats } from '@/lib/matrixCalculations';
import { cleanTrainerNotes } from '@/lib/utils';
import type { MatrixOverrideRecord } from '@/types/matrix';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params;
    if (!driverId) {
      return NextResponse.json({ error: 'Parameter driverId wajib disertakan' }, { status: 400 });
    }

    const overrides = getMatrixOverrides();
    const override = overrides[driverId];

    if (!override) {
      return NextResponse.json({ found: false, override: null });
    }

    return NextResponse.json({ found: true, override });
  } catch (error: any) {
    console.error(`[GET /api/matrix/${params.driverId}] Error:`, error);
    return NextResponse.json({ error: error.message || 'Gagal memuat override' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params;
    if (!driverId) {
      return NextResponse.json({ error: 'Parameter driverId wajib disertakan' }, { status: 400 });
    }

    const body = await request.json();
    const { driverName, aspectScores, notes, drivingNotes, forkliftNotes } = body;

    if (!Array.isArray(aspectScores) || aspectScores.length !== 10) {
      return NextResponse.json(
        { error: 'aspectScores harus berupa array dengan 10 elemen (skala 0-4 atau null)' },
        { status: 400 }
      );
    }

    // Normalisasi skor (pastikan nilai berada di antara 0-4 atau null)
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

    // Hitung ulang AVG dan Level secara proporsional
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

    // Simpan ke storage persistence
    saveMatrixOverride(overrideRecord);

    // Jika driverId terhubung dengan record assessment di database Prisma, catat catatan sinkronisasi
    try {
      const existingAssessment = await prisma.assessment.findUnique({
        where: { id: driverId },
      });

      if (existingAssessment) {
        const auditNote = `[Manual Matrix Override: AVG=${avg ?? '—'}, Level=${level}, Updated=${new Date().toISOString()}]`;
        const currentNotes = existingAssessment.trainerNotes || '';
        let updatedNotes = currentNotes.includes('[Manual Matrix Override')
          ? currentNotes.replace(/\[Manual Matrix Override:[^\]]+\]/, auditNote)
          : currentNotes ? `${currentNotes}\n${auditNote}` : auditNote;

        if (combinedNotes) {
          updatedNotes = `${updatedNotes}\nCatatan Kemampuan: ${combinedNotes}`;
        }

        await prisma.assessment.update({
          where: { id: driverId },
          data: {
            trainerNotes: updatedNotes,
          },
        });
      }
    } catch (dbError) {
      // Jika database offline atau driverId berupa fallback mock (DRV-xxx), abaikan error DB
      console.warn('[PUT /api/matrix] DB sync note (optional):', (dbError as any)?.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Nilai matriks berhasil diperbarui',
      data: overrideRecord,
    });
  } catch (error: any) {
    console.error(`[PUT /api/matrix/${params.driverId}] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan perubahan matrix' },
      { status: 500 }
    );
  }
}
