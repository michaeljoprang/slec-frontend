import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { DDT_SECTIONS } from '@/features/assessment/ddt';
import { TMMIN_CHECKLIST_DATA } from '@/features/assessment/tmmin';
import { FORKLIFT_REFRESHMENT_SECTIONS } from '@/features/assessment/forkliftRefreshment';
import type { AssessmentType } from '@/lib/assessment';
import { formatVehicleIdentifier, formatPersonName, isForkliftAssessment } from '@/lib/assessment';

export const dynamic = 'force-dynamic';

function ensureLogoExists() {
  try {
    const destDir = path.resolve(process.cwd(), 'public/images');
    const destPath = path.resolve(destDir, 'slec-logo.jpeg');
    if (!fs.existsSync(destPath)) {
      const possibleSources = [
        path.resolve(process.cwd(), '../SLEC logo.jpeg'),
        path.resolve(process.cwd(), 'SLEC logo.jpeg'),
      ];
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          fs.copyFileSync(src, destPath);
          break;
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

export async function GET() {
  try {
    ensureLogoExists();
    // @ts-ignore - Bypass strict schema validation for MVP phase
    const assessments = await prisma.assessment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const mappedAssessments = assessments.map((a: any) => {
      const sioMatch = a.trainerNotes?.match(/\[SIO Kemnaker:\s*([^\]]+)\]/);
      const sioKemnaker = sioMatch ? sioMatch[1].trim() : '';

      const startedMatch = a.trainerNotes?.match(/\[StartedAt:\s*([^\]]+)\]/);
      const startedAt = startedMatch
        ? startedMatch[1].trim()
        : (a.createdAt ? new Date(a.createdAt).toISOString() : null);

      const finishedMatch = a.trainerNotes?.match(/\[FinishedAt:\s*([^\]]+)\]/);
      const isFinalStatus = ['PASS', 'FAIL', 'DISQUALIFIED', 'COMPLETED'].includes(String(a.result || '').toUpperCase());
      const finishedAt = finishedMatch
        ? finishedMatch[1].trim()
        : isFinalStatus
        ? (a.updatedAt ? new Date(a.updatedAt).toISOString() : null)
        : null;

      return {
        ...a,
        duration: a.durationSeconds ?? 0,
        durationSeconds: a.durationSeconds ?? 0,
        sioKemnaker,
        startedAt,
        finishedAt,
      };
    });

    return NextResponse.json(mappedAssessments);
  } catch (error) {
    console.error('Failed to fetch assessments:', error);
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    ensureLogoExists();
    const data = await request.json();

    const header = data.header || {};
    const scoreResult = data.scoreResult || {};
    const rawDuration = data.duration ?? data.durationSeconds;
    const durationSeconds = rawDuration == null ? 0 : Number(rawDuration);

    let assessmentType: AssessmentType = data.assessmentType;
    if (!assessmentType) {
      if ((header.jenisKendaraan || '').toLowerCase().includes('forklift')) {
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
      (header.jenisKendaraan && header.jenisKendaraan.toLowerCase().includes('forklift')) ||
      (header.trainingProgram && header.trainingProgram.toLowerCase().includes('forklift'))
    );

    const requestedResult = String(data.result || scoreResult.result || 'DRAFT').toUpperCase().trim();
    const now = new Date();
    const startedAtIso = data.startedAt || now.toISOString();

    let notes = data.trainerNotes || '';
    if (header.sioKemnaker) {
      const sioTag = `[SIO Kemnaker: ${header.sioKemnaker}]`;
      if (!notes.includes('[SIO Kemnaker:')) {
        notes = notes ? `${notes}\n${sioTag}` : sioTag;
      }
    }
    if (!notes.includes('[StartedAt:')) {
      const startTag = `[StartedAt: ${startedAtIso}]`;
      notes = notes ? `${notes}\n${startTag}` : startTag;
    }

    if (requestedResult === 'DRAFT' || requestedResult === 'IN_PROGRESS') {
      if (!notes.includes('[Status:')) {
        notes = `${notes}\n[Status: ${requestedResult}]`;
      }
    } else if (data.finishedAt || ['PASS', 'FAIL', 'DISQUALIFIED', 'COMPLETED'].includes(requestedResult)) {
      const finishIso = data.finishedAt || now.toISOString();
      if (!notes.includes('[FinishedAt:')) {
        notes = `${notes}\n[FinishedAt: ${finishIso}]`;
      }
      if (!notes.includes('[Status:')) {
        notes = `${notes}\n[Status: COMPLETED]`;
      }
    }

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

    const hasCustomSections = Array.isArray(data.sections) && data.sections.length > 0;

    const payload = {
      assessmentType,
      trainingProgram: data.trainingProgram || header.trainingProgram || null,
      durationSeconds: !Number.isNaN(durationSeconds) ? durationSeconds : 0,
      assessmentDate: header.tanggal ? new Date(header.tanggal).toISOString() : now.toISOString(),
      participantName: formatPersonName(header.namaPeserta) || 'Unknown',
      age: header.umur || null,
      // DDTHeaderInfo uses golSIM and masaBerlakuSIM (note capitalisation)
      simCategory: header.golSIM || header.golSim || null,
      simIssueDate: header.tglTerbitSim || null,
      simExpiryDate: header.masaBerlakuSIM || header.tglBerakhirSim || null,
      vehicleType: header.jenisKendaraan || 'Unknown',
      licensePlate: header.noPolisi ? formatVehicleIdentifier(header.noPolisi, isForklift) : 'Unknown',
      testLocation: header.lokasiTest || 'Unknown',
      instructor: formatPersonName(header.instruktur) || 'Unknown',
      score: Number(data.score ?? scoreResult.score ?? scoreResult.actual ?? 0),
      totalPoint: Number(data.totalPoint ?? scoreResult.totalPoint ?? maxTotal),
      totalDeduction: Number(data.totalDeduction ?? scoreResult.totalDeduction ?? 0),
      actualPoint: Number(data.actualPoint ?? scoreResult.actual ?? 0),
      result: requestedResult,
      trainerNotes: notes.trim() || null,
      sections: {
        create: hasCustomSections
          ? data.sections.map((sec: any) => ({
              sectionCode: String(sec.sectionId || sec.sectionCode || 'Unknown'),
              sectionName: String(sec.sectionName || sec.sectionId || 'Unknown'),
              totalPoint: Number(sec.totalPoint) || 0,
              totalDeduction: Number(sec.totalDeduction) || 0,
              actualPoint: Number(sec.actualPoint) || 0,
              answers: {
                create: (sec.items || []).map((item: any) => ({
                  itemId: String(item.itemId || item.id || 'Unknown'),
                  itemName: item.itemName || item.label || item.description || null,
                  answer: String(item.answer ?? ''),
                  deductionPoint: Number(item.deductionPoint) || 0,
                }))
              }
            }))
          : generateSectionData()
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
