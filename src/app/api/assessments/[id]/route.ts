import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { formatVehicleIdentifier, formatPersonName, isForkliftAssessment } from '@/lib/assessment';
import { calculateForkliftRefreshmentScore } from '@/features/assessment/forkliftRefreshment';
import { calculateTmminScore } from '@/features/assessment/tmmin';

export const dynamic = 'force-dynamic';

function parseSectionDurations(notes?: string | null): Record<string, number> {
  if (!notes) return {};
  const match = notes.match(/\[SectionDurations:\s*([^\]]+)\]/);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return {};
    }
  }
  return {};
}

function updateSectionDurationsInNotes(notes: string | null | undefined, sectionDurations: Record<string, number>): string {
  const currentNotes = notes || '';
  const tag = `[SectionDurations: ${JSON.stringify(sectionDurations)}]`;
  if (currentNotes.includes('[SectionDurations:')) {
    return currentNotes.replace(/\[SectionDurations:[^\]]+\]/, tag);
  }
  return currentNotes ? `${currentNotes}\n${tag}` : tag;
}

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

    const sioMatch = assessment.trainerNotes?.match(/\[SIO Kemnaker:\s*([^\]]+)\]/);
    const sioKemnaker = sioMatch ? sioMatch[1].trim() : '';

    const startedMatch = assessment.trainerNotes?.match(/\[StartedAt:\s*([^\]]+)\]/);
    const startedAt = startedMatch ? startedMatch[1].trim() : (assessment.createdAt ? new Date(assessment.createdAt).toISOString() : null);

    const finishedMatch = assessment.trainerNotes?.match(/\[FinishedAt:\s*([^\]]+)\]/);

    // Count answered items
    let answeredItems = 0;
    let totalItems = 0;
    if (Array.isArray(assessment.sections)) {
      for (const sec of assessment.sections) {
        if (Array.isArray(sec.answers)) {
          for (const ans of sec.answers) {
            totalItems++;
            const a = ans.answer?.trim();
            if (a === 'YES' || a === 'NO') {
              answeredItems++;
            } else if (a && a !== 'UNKNOWN' && a !== '0' && !Number.isNaN(Number(a)) && Number(a) > 0) {
              answeredItems++;
            }
          }
        }
      }
    }

    // Finished if explicitly tagged with [FinishedAt: ...] OR result is definitive (PASS / FAIL / DISQUALIFIED / COMPLETED)
    const isFinalized = Boolean(finishedMatch) || ['PASS', 'FAIL', 'DISQUALIFIED', 'COMPLETED'].includes(String(assessment.result || '').toUpperCase());
    const isAllItemsCompleted = totalItems > 0 && answeredItems === totalItems;
    const isCompleted = isFinalized || isAllItemsCompleted;
    const finishedAt = finishedMatch
      ? finishedMatch[1].trim()
      : isCompleted
      ? (assessment.updatedAt ? new Date(assessment.updatedAt).toISOString() : null)
      : null;

    // Normalize status only if assessment has not been finalized yet
    let normalizedResult = assessment.result;
    if (!isFinalized) {
      if (answeredItems === 0) {
        normalizedResult = 'DRAFT';
      } else {
        normalizedResult = 'IN_PROGRESS';
      }
    }

    const sectionDurations = parseSectionDurations(assessment.trainerNotes);
    const mappedSections = (assessment.sections || []).map((sec) => ({
      ...sec,
      durationSeconds: sectionDurations[sec.sectionCode] ?? 0,
    }));

    return NextResponse.json({
      ...assessment,
      duration: assessment.durationSeconds ?? 0,
      durationSeconds: assessment.durationSeconds ?? 0,
      sections: mappedSections,
      result: normalizedResult,
      sioKemnaker,
      startedAt,
      finishedAt,
      sectionDurations,
    });
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
    const id = String(params.id);
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const data = await request.json();
    const existing = await prisma.assessment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

    // Edit mode: allows updating score, notes, sections, and participant header fields,
    // while keeping immutable audit fields (createdAt, assessmentDate, durationSeconds) frozen.
    const header = data.header || {};
    const scoreResult = data.scoreResult || {};
    const updateData: Record<string, unknown> = {};

    if (data.score !== undefined) updateData.score = Number(data.score);
    else if (scoreResult.score !== undefined) updateData.score = Number(scoreResult.score);

    if (data.result !== undefined) updateData.result = String(data.result);
    else if (scoreResult.result !== undefined) updateData.result = String(scoreResult.result);

    if (data.durationSeconds !== undefined) {
      updateData.durationSeconds = Math.max(0, Math.round(Number(data.durationSeconds) || 0));
    }

    let notes = data.trainerNotes !== undefined ? data.trainerNotes : existing.trainerNotes;
    if (header.sioKemnaker) {
      const sioTag = `[SIO Kemnaker: ${header.sioKemnaker}]`;
      if (notes) {
        if (notes.includes('[SIO Kemnaker:')) {
          notes = notes.replace(/\[SIO Kemnaker:[^\]]+\]/, sioTag);
        } else {
          notes = `${notes}\n${sioTag}`;
        }
      } else {
        notes = sioTag;
      }
      updateData.trainerNotes = notes;
    } else if (data.trainerNotes !== undefined) {
      updateData.trainerNotes = data.trainerNotes || null;
    }

    if (data.finishedAt) {
      const finishTag = `[FinishedAt: ${data.finishedAt}]`;
      if (notes) {
        if (notes.includes('[FinishedAt:')) {
          notes = notes.replace(/\[FinishedAt:[^\]]+\]/, finishTag);
        } else {
          notes = `${notes}\n${finishTag}`;
        }
      } else {
        notes = finishTag;
      }
      updateData.trainerNotes = notes;
    } else if (data.finishedAt === null && notes) {
      notes = notes.replace(/\[FinishedAt:[^\]]+\]\s*/g, '').replace(/\[Status:\s*COMPLETED\]\s*/g, '').trim();
      updateData.trainerNotes = notes || null;
    }

    if (data.totalPoint !== undefined) updateData.totalPoint = Number(data.totalPoint);
    else if (scoreResult.totalPoint !== undefined) updateData.totalPoint = Number(scoreResult.totalPoint);

    if (data.totalDeduction !== undefined) updateData.totalDeduction = Number(data.totalDeduction);
    else if (scoreResult.totalDeduction !== undefined) updateData.totalDeduction = Number(scoreResult.totalDeduction);

    if (data.actualPoint !== undefined) updateData.actualPoint = Number(data.actualPoint);
    else if (scoreResult.actual !== undefined) updateData.actualPoint = Number(scoreResult.actual);

    if (data.participantName !== undefined) updateData.participantName = formatPersonName(data.participantName);
    else if (header.namaPeserta !== undefined) updateData.participantName = formatPersonName(header.namaPeserta);

    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    else if (header.jenisKendaraan !== undefined) updateData.vehicleType = header.jenisKendaraan;

    const targetPlate = data.licensePlate !== undefined ? data.licensePlate : header.noPolisi;
    if (targetPlate !== undefined) {
      const isForklift = Boolean(
        isForkliftAssessment(existing.assessmentType) ||
        (existing.vehicleType || '').toLowerCase().includes('forklift') ||
        (existing.trainingProgram || '').toLowerCase().includes('forklift')
      );
      updateData.licensePlate = targetPlate ? formatVehicleIdentifier(targetPlate, isForklift) : '-';
    }

    if (data.testLocation !== undefined) updateData.testLocation = data.testLocation;
    else if (header.lokasiTest !== undefined) updateData.testLocation = header.lokasiTest;

    if (data.instructor !== undefined) updateData.instructor = formatPersonName(data.instructor);
    else if (header.instruktur !== undefined) updateData.instructor = formatPersonName(header.instruktur);

    if (data.trainingProgram !== undefined) updateData.trainingProgram = data.trainingProgram || null;
    else if (header.trainingProgram !== undefined) updateData.trainingProgram = header.trainingProgram || null;

    if (data.age !== undefined) updateData.age = data.age || null;
    else if (header.umur !== undefined) updateData.age = header.umur || null;

    if (data.simCategory !== undefined) updateData.simCategory = data.simCategory || null;
    else if (header.golSIM !== undefined) updateData.simCategory = header.golSIM || null;

    if (data.simExpiryDate !== undefined) updateData.simExpiryDate = data.simExpiryDate || null;
    else if (header.masaBerlakuSIM !== undefined) updateData.simExpiryDate = header.masaBerlakuSIM || null;

    if (data.sectionDurations && typeof data.sectionDurations === 'object') {
      notes = updateSectionDurationsInNotes(notes, data.sectionDurations);
      updateData.trainerNotes = notes;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (Array.isArray(data.sections)) {
        await tx.assessmentSection.deleteMany({ where: { assessmentId: id } });
        updateData.sections = {
          create: data.sections.map((section: any) => ({
            sectionCode: String(section.sectionId || section.sectionCode || 'UNKNOWN'),
            sectionName: String(section.sectionName || section.sectionId || 'Unknown'),
            totalPoint: Number(section.totalPoint) || 0,
            totalDeduction: Number(section.totalDeduction) || 0,
            actualPoint: Number(section.actualPoint) || 0,
            answers: { create: (section.items || []).map((item: any) => ({
              itemId: String(item.itemId || 'UNKNOWN'),
              itemName: item.itemName || null,
              answer: String(item.answer ?? 'UNKNOWN'),
              deductionPoint: Number(item.deductionPoint) || 0,
            })) },
          })),
        };
      }
      return tx.assessment.update({ where: { id }, data: updateData });
    });

    try {
      revalidatePath('/assessment/history');
      revalidatePath(`/assessment/history/${id}`);
      revalidatePath(`/assessment/edit/${id}`);
      revalidatePath('/matrix');
      revalidatePath('/reports');
      revalidatePath('/dashboard');
      revalidatePath('/');
    } catch {
      // Ignore
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`Failed to update assessment ${params.id}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update assessment' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = String(params.id);
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const body = await request.json();
    const existing = await prisma.assessment.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!existing) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

    const existingSectionDurations = parseSectionDurations(existing.trainerNotes);
    let updatedSectionDurations = { ...existingSectionDurations };

    let sectionDurationsUpdated = false;
    if (body.sectionDurations && typeof body.sectionDurations === 'object') {
      sectionDurationsUpdated = true;
      for (const [code, secVal] of Object.entries(body.sectionDurations)) {
        updatedSectionDurations[code] = Math.max(0, Math.round(Number(secVal) || 0));
      }
    } else if (body.sectionCode && body.sectionDurationSeconds !== undefined) {
      sectionDurationsUpdated = true;
      updatedSectionDurations[body.sectionCode] = Math.max(0, Math.round(Number(body.sectionDurationSeconds) || 0));
    }

    // Determine new total duration
    let newDurationSeconds: number;
    if (body.durationSeconds !== undefined) {
      newDurationSeconds = Math.max(0, Math.round(Number(body.durationSeconds) || 0));
    } else if (sectionDurationsUpdated && Object.keys(updatedSectionDurations).length > 0) {
      newDurationSeconds = Object.values(updatedSectionDurations).reduce((sum, s) => sum + (Number(s) || 0), 0);
    } else {
      newDurationSeconds = existing.durationSeconds || 0;
    }

    // Clean overwrite: Update [SectionDurations: ...] in trainerNotes without adding any edit logs
    let notes = existing.trainerNotes || '';
    if (sectionDurationsUpdated && Object.keys(updatedSectionDurations).length > 0) {
      notes = updateSectionDurationsInNotes(notes, updatedSectionDurations);
    }

    // Synchronize [FinishedAt: ...] if [StartedAt: ...] exists in notes
    const startedMatch = notes.match(/\[StartedAt:\s*([^\]]+)\]/);
    if (startedMatch) {
      const startMs = new Date(startedMatch[1].trim()).getTime();
      if (!isNaN(startMs)) {
        const newFinishIso = new Date(startMs + newDurationSeconds * 1000).toISOString();
        if (notes.includes('[FinishedAt:')) {
          notes = notes.replace(/\[FinishedAt:[^\]]+\]/, `[FinishedAt: ${newFinishIso}]`);
        } else {
          notes = `${notes}\n[FinishedAt: ${newFinishIso}]`;
        }
      }
    }

    const updateData: Record<string, unknown> = {
      durationSeconds: newDurationSeconds,
      trainerNotes: notes || null,
    };

    // Recalculate score & result based on new duration (penalties, overtime)
    // Overtime rules:
    // TMMIN_REFRESHMENT: standard 600s, max 900s, passing 75
    // TMMIN / TMMIN_STANDARD: standard 480s, max 600s, passing 70
    // DDT: standard 600s, max 600s, passing 70
    const type = (existing.assessmentType || '').toUpperCase().trim();
    const fatalReason = existing.trainerNotes?.match(/\[(?:FatalError|Alasan Diskualifikasi):[^\]]+\]/);

    if (type === 'TMMIN_REFRESHMENT') {
      const frequencies: Record<string, number> = {};
      for (const sec of existing.sections || []) {
        for (const ans of sec.answers || []) {
          frequencies[ans.itemId] = Math.max(0, parseInt(ans.answer, 10) || 0);
        }
      }
      const calc = calculateForkliftRefreshmentScore(frequencies, newDurationSeconds);
      updateData.score = body.score !== undefined ? Number(body.score) : calc.score;
      updateData.totalDeduction = body.totalDeduction !== undefined ? Number(body.totalDeduction) : calc.totalDeduction;
      updateData.actualPoint = body.actualPoint !== undefined ? Number(body.actualPoint) : calc.actual;

      if (!fatalReason) {
        if (body.result !== undefined) {
          updateData.result = String(body.result);
        } else if (newDurationSeconds > 900) {
          updateData.result = 'FAIL';
        } else {
          const s = Number(updateData.score) || 0;
          updateData.result = s >= 75 ? 'PASS' : 'FAIL';
        }
      }
    } else if (type === 'TMMIN' || type === 'TMMIN_STANDARD') {
      const frequencies: Record<string, number> = {};
      for (const sec of existing.sections || []) {
        for (const ans of sec.answers || []) {
          frequencies[ans.itemId] = Math.max(0, parseInt(ans.answer, 10) || 0);
        }
      }
      const calc = calculateTmminScore(frequencies, newDurationSeconds);
      updateData.score = body.score !== undefined ? Number(body.score) : calc.score;
      updateData.totalDeduction = body.totalDeduction !== undefined ? Number(body.totalDeduction) : calc.totalDeduction;
      updateData.actualPoint = body.actualPoint !== undefined ? Number(body.actualPoint) : calc.actual;

      if (!fatalReason) {
        if (body.result !== undefined) {
          updateData.result = String(body.result);
        } else if (newDurationSeconds > 600) {
          updateData.result = 'FAIL';
        } else {
          const s = Number(updateData.score) || 0;
          updateData.result = s >= 70 ? 'PASS' : 'FAIL';
        }
      }
    } else {
      // DDT
      if (body.score !== undefined) updateData.score = Number(body.score);
      const currentScore = updateData.score !== undefined ? Number(updateData.score) : (existing.score || 0);

      if (!fatalReason) {
        if (body.result !== undefined) {
          updateData.result = String(body.result);
        } else if (newDurationSeconds > 600) {
          updateData.result = 'FAIL';
        } else {
          updateData.result = currentScore >= 70 ? 'PASS' : 'FAIL';
        }
      }
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: updateData,
      include: {
        sections: {
          include: {
            answers: true,
          },
        },
      },
    });

    try {
      revalidatePath('/assessment/history');
      revalidatePath(`/assessment/history/${id}`);
      revalidatePath(`/assessment/edit/${id}`);
      revalidatePath('/matrix');
      revalidatePath('/reports');
      revalidatePath('/dashboard');
      revalidatePath('/');
    } catch {
      // Ignore
    }

    const mappedSections = (updated.sections || []).map((sec) => ({
      ...sec,
      durationSeconds: updatedSectionDurations[sec.sectionCode] ?? 0,
    }));

    return NextResponse.json({
      ...updated,
      duration: updated.durationSeconds,
      durationSeconds: updated.durationSeconds,
      sections: mappedSections,
      sectionDurations: updatedSectionDurations,
      success: true,
    });
  } catch (error: any) {
    console.error(`Failed to patch assessment ${params.id}:`, error);
    return NextResponse.json({ error: error.message || 'Failed to patch assessment' }, { status: 500 });
  }
}


