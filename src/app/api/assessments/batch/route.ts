import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { FORKLIFT_REFRESHMENT_SECTIONS } from '@/features/assessment/forkliftRefreshment';
import type { AssessmentType } from '@/lib/assessment';
import { formatVehicleIdentifier, isForkliftAssessment } from '@/lib/assessment';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sharedHeader, participants } = body;

    if (!sharedHeader) {
      return NextResponse.json({ error: 'Data header sesi bersama wajib diisi' }, { status: 400 });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Daftar peserta minimal harus berisi 1 orang' }, { status: 400 });
    }

    // Filter valid participants with names
    const validParticipants = participants.filter(
      (p: any) => p && typeof p.namaPeserta === 'string' && p.namaPeserta.trim().length > 0
    );

    if (validParticipants.length === 0) {
      return NextResponse.json({ error: 'Nama peserta tidak boleh kosong' }, { status: 400 });
    }

    let assessmentType: AssessmentType = sharedHeader.assessmentType;
    if (!assessmentType) {
      if ((sharedHeader.jenisKendaraan || '').toLowerCase().includes('forklift')) {
        assessmentType = 'TMMIN_STANDARD';
      } else {
        assessmentType = 'DDT';
      }
    }

    const isRefreshment = assessmentType === 'TMMIN_REFRESHMENT';
    const isStandard = assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD';
    const maxTotal = isRefreshment ? 277 : isStandard ? 134 : 100;
    const isForklift = Boolean(
      isForkliftAssessment(assessmentType) ||
      (sharedHeader.jenisKendaraan && sharedHeader.jenisKendaraan.toLowerCase().includes('forklift')) ||
      (sharedHeader.trainingProgram && sharedHeader.trainingProgram.toLowerCase().includes('forklift'))
    );

    // Helper to generate section templates with uninitialized/empty answers
    const generateSectionData = () => {
      if (isRefreshment) {
        return FORKLIFT_REFRESHMENT_SECTIONS.map((sec) => ({
          sectionCode: sec.code,
          sectionName: sec.name,
          totalPoint: sec.totalPoint,
          totalDeduction: 0,
          actualPoint: 0,
          answers: {
            create: sec.items.map((item) => ({
              itemId: item.id,
              itemName: item.label,
              answer: '',
              deductionPoint: 0,
            })),
          },
        }));
      }

      if (isStandard) {
        return TMMIN_CHECKLIST_DATA.map((sec) => ({
          sectionCode: sec.code,
          sectionName: sec.name,
          totalPoint: sec.totalPoint,
          totalDeduction: 0,
          actualPoint: 0,
          answers: {
            create: sec.items.map((item) => ({
              itemId: item.id,
              itemName: item.label,
              answer: '',
              deductionPoint: 0,
            })),
          },
        }));
      }

      return DDT_SECTIONS.map((sec) => ({
        sectionCode: sec.id,
        sectionName: sec.title || sec.label,
        totalPoint: sec.totalPoint,
        totalDeduction: 0,
        actualPoint: 0,
        answers: {
          create: sec.items.map((item) => ({
            itemId: item.id,
            itemName: item.description || item.text,
            answer: '',
            deductionPoint: 0,
          })),
        },
      }));
    };

    const now = new Date();
    const dateIso = sharedHeader.tanggal ? new Date(sharedHeader.tanggal).toISOString() : now.toISOString();

    const createdAssessments = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const p of validParticipants) {
        let notes = `[Draft Batch: ${sharedHeader.trainingProgram || 'NEOP'}]`;
        notes += `\n[Status: DRAFT]`;
        notes += `\n[StartedAt: ${now.toISOString()}]`;
        if (p.sioKemnaker) {
          notes += `\n[SIO Kemnaker: ${p.sioKemnaker}]`;
        }

        const created = await tx.assessment.create({
          data: {
            assessmentType,
            trainingProgram: sharedHeader.trainingProgram || 'NEOP',
            assessmentDate: dateIso,
            participantName: p.namaPeserta.trim(),
            age: p.umur ? String(p.umur).trim() : null,
            simCategory: p.golSIM ? String(p.golSIM).trim() : null,
            simExpiryDate: p.masaBerlakuSIM ? String(p.masaBerlakuSIM).trim() : null,
            vehicleType: sharedHeader.jenisKendaraan || 'CDD',
            licensePlate: p.noPolisi ? formatVehicleIdentifier(p.noPolisi, isForklift) : '-',
            testLocation: sharedHeader.lokasiTest || 'CCR CIBITUNG 1',
            instructor: sharedHeader.instruktur || 'Yayan',
            score: 0,
            totalPoint: maxTotal,
            totalDeduction: 0,
            actualPoint: 0,
            result: 'DRAFT',
            durationSeconds: 0,
            trainerNotes: notes,
            sections: {
              create: generateSectionData(),
            },
          },
          select: {
            id: true,
            participantName: true,
            vehicleType: true,
            licensePlate: true,
            assessmentType: true,
            trainingProgram: true,
          },
        });
        results.push(created);
      }
      return results;
    });

    return NextResponse.json(
      {
        success: true,
        count: createdAssessments.length,
        created: createdAssessments,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create batch assessments:', error);
    return NextResponse.json({ error: error.message || 'Gagal membuat batch asesmen' }, { status: 500 });
  }
}
