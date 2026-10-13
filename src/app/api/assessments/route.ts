import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // @ts-ignore - Bypass strict schema validation for MVP phase
    const assessments = await prisma.assessment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error('Failed to fetch assessments:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const header = data.header || {};
    const scoreResult = data.scoreResult || {};

    const payload = {
      assessmentType: data.assessmentType || 'DDT',
      assessmentDate: header.tanggal ? new Date(header.tanggal).toISOString() : new Date().toISOString(),
      participantName: header.namaPeserta || 'Unknown',
      age: header.umur || null,
      // DDTHeaderInfo uses golSIM and masaBerlakuSIM (note capitalisation)
      simCategory: header.golSIM || header.golSim || null,
      simIssueDate: header.tglTerbitSim || null,
      simExpiryDate: header.masaBerlakuSIM || header.tglBerakhirSim || null,
      vehicleType: header.jenisKendaraan || 'Unknown',
      licensePlate: header.noPolisi || 'Unknown',
      testLocation: header.lokasiTest || 'Unknown',
      instructor: header.instruktur || 'Unknown',
      score: Number(scoreResult.score ?? scoreResult.actual ?? 0),
      totalPoint: scoreResult.totalPoint ?? null,
      totalDeduction: scoreResult.totalDeduction ?? null,
      actualPoint: scoreResult.actual ?? null,
      result: scoreResult.result || 'FAIL',
      trainerNotes: data.trainerNotes || null,
      sections: {
        create: (data.sections || []).map((sec: any) => ({
          sectionCode: sec.sectionId || 'Unknown',
          sectionName: sec.sectionName || sec.sectionId || 'Unknown',
          totalPoint: sec.totalPoint || 0,
          totalDeduction: sec.totalDeduction || 0,
          actualPoint: sec.actualPoint || 0,
          answers: {
            create: (sec.items || []).map((item: any) => ({
              itemId: item.itemId || 'Unknown',
              itemName: item.itemName || null,
              answer: String(item.answer || 'UNKNOWN'),
              deductionPoint: Number(item.deductionPoint) || 0,
            }))
          }
        }))
      }
    };

    console.log("PAYLOAD:", JSON.stringify(payload, null, 2));

    const newAssessment = await prisma.assessment.create({
      data: payload,
    });

    return NextResponse.json(newAssessment, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create assessment:', error);
    return NextResponse.json({ error: error.message || 'Failed to create assessment' }, { status: 500 });
  }
}
