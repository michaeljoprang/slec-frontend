import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const assessment = await prisma.assessment.findUnique({
      where: {
        id: String(id),
      },
      include: {
        sections: {
          include: {
            answers: true
          }
        }
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error(`Failed to fetch assessment ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await prisma.assessment.delete({
      where: {
        id: String(id),
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete assessment ${params.id}:`, error);
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const data = await request.json();

    const header = data.header || {};
    const assessmentType = data.assessmentType || 'DDT';
    
    const sections = data.sections || [];
    let totalDeductions = 0;
    
    for (const sec of sections) {
      totalDeductions += Number(sec.totalDeduction || 0);
    }
    
    let calculatedScore = 0;
    const durationSeconds = data.durationSeconds == null ? null : Number(data.durationSeconds);

    if (assessmentType === 'TMMIN_REFRESHMENT') {
       calculatedScore = Math.max(0, Math.round(((277 - totalDeductions) / 277) * 100));
    } else if (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD') {
       calculatedScore = ((134 - totalDeductions) / 134) * 100;
       calculatedScore = Math.max(0, Math.min(100, calculatedScore));
    } else {
       calculatedScore = 100 - totalDeductions;
       calculatedScore = Math.max(0, Math.min(100, calculatedScore));
    }

    const payload = {
      assessmentType,
      trainingProgram: data.trainingProgram || header.trainingProgram || null,
      durationSeconds,
      assessmentDate: header.tanggal ? new Date(header.tanggal).toISOString() : new Date().toISOString(),
      participantName: header.namaPeserta || 'Unknown',
      age: header.umur || null,
      simCategory: header.golSIM || header.golSim || null,
      simIssueDate: header.tglTerbitSim || null,
      simExpiryDate: header.masaBerlakuSIM || header.tglBerakhirSim || null,
      vehicleType: header.jenisKendaraan || 'Unknown',
      licensePlate: header.noPolisi || 'Unknown',
      testLocation: header.lokasiTest || 'Unknown',
      instructor: header.instruktur || 'Unknown',
      score: calculatedScore,
      totalPoint: assessmentType === 'TMMIN_REFRESHMENT' ? 277 : (assessmentType === 'TMMIN' || assessmentType === 'TMMIN_STANDARD' ? 134 : 100),
      totalDeduction: totalDeductions,
      actualPoint: calculatedScore,
      result: assessmentType === 'TMMIN_REFRESHMENT' ? (calculatedScore >= 75 ? 'PASS' : 'FAIL') : (calculatedScore >= 70 ? 'PASS' : 'FAIL'),
      trainerNotes: data.trainerNotes || null,
    };

    const updatedAssessment = await prisma.assessment.update({
      where: { id: String(id) },
      data: {
         ...payload,
         sections: {
            deleteMany: {},
            create: sections.map((sec: any) => ({
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
      }
    });

    return NextResponse.json(updatedAssessment);
  } catch (error: any) {
    console.error(`Failed to update assessment ${params.id}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update assessment' }, { status: 500 });
  }
}

