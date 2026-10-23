import fs from 'fs';
import path from 'path';
import AppShell from '@/components/layout/AppShell';
import SkillMatrixTable from '@/components/matrix/SkillMatrixTable';
import { getSkillMatrixData } from '@/lib/matrixService';

export const dynamic = 'force-dynamic';

function ensureLogoPng() {
  try {
    const publicDir = path.resolve(process.cwd(), 'public');
    const pngPath = path.resolve(publicDir, 'logo-slec.png');
    if (!fs.existsSync(pngPath)) {
      const possibleSources = [
        path.resolve(publicDir, 'images/slec-logo.jpeg'),
        path.resolve(publicDir, 'logo-slec.jpeg'),
      ];
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, pngPath);
          break;
        }
      }
    }
  } catch (_) {}
}

export default async function MatrixPage() {
  ensureLogoPng();
  const { drivers } = await getSkillMatrixData();

  return (
    <AppShell pageTitle="Skill Matrix">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <SkillMatrixTable drivers={drivers} />
    </AppShell>
  );
}
