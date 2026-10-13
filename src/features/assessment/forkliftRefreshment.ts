export interface ForkliftRefreshmentItem {
  id: string;
  sectionCode: string;
  label: string;
  deduction: number;
  plan: number;
}

export interface ForkliftRefreshmentSection {
  id: string;
  code: string;
  name: string;
  totalPoint: number;
  items: ForkliftRefreshmentItem[];
}

export const FORKLIFT_REFRESHMENT_BASE_SCORE = 277;
export const FORKLIFT_REFRESHMENT_PASSING_SCORE = 75;
export const FORKLIFT_REFRESHMENT_STANDARD_TIME_SECONDS = 600;
export const FORKLIFT_REFRESHMENT_MAX_TIME_SECONDS = 900;

const item = (sectionCode: string, index: number, label: string, deduction: number, plan: number): ForkliftRefreshmentItem => ({
  id: `${sectionCode}_${index}`,
  sectionCode,
  label,
  deduction,
  plan,
});

const S1 = [
  'PENGECEKAN APD - Melakukan pengecekan APD yang digunakan',
  'KONFIRMASI - Melakukan konfirmasi "Handle OK, Seat OK, Step OK"',
  'SIKAP MENGENDARAI & KONFIRMASI - Memegang handle dengan tangan kiri dan seat dengan tangan kanan',
  'SIKAP MENGENDARAI & KONFIRMASI - Naik dengan kaki kiri',
  'SIKAP MENGENDARAI & KONFIRMASI - Memakai safety belt',
  'SIKAP MENGENDARAI & KONFIRMASI - Konfirmasi "Safety belt OK"',
  'SIKAP MENGENDARAI & KONFIRMASI - Konfirmasi "Hand Brake OK"',
  'HANDLE PERSENELING - Menggerakkan tuas posisi netral',
  'HANDLE PERSENELING - Konfirmasi "Netral OK"',
  'ENGINE START - Konfirmasi "Kunci OK"',
  'ENGINE START - Konfirmasi "Indikator Forklift OK"',
  'ENGINE START - Menginjak pedal kopling & pedal rem dengan penuh',
  'LAMPU DEPAN, LAMPU BELAKANG & SEIN - Menyalakan lampu depan',
  'LAMPU DEPAN, LAMPU BELAKANG & SEIN - Konfirmasi Lampu Depan & Belakang (kanan & kiri) OK',
  'LAMPU DEPAN, LAMPU BELAKANG & SEIN - Konfirmasi Lampu Sein Depan & Belakang (kanan & kiri) OK',
  'GARPU - Mengangkat garpu kurang dan lebih dari ketentuan (15-20 cm)',
  'POSISI FIX SAAT PARKIR - Posisi forklift sejajar dengan garis parkir (parkirnya miring)',
  'POSISI FIX SAAT PARKIR - Posisi ban belakang rata & tidak miring',
  'POSISI FIX SAAT PARKIR - Ujung garpu kena garis / keluar dari garis parkir',
  'HANDLE PERSENELING - Tidak dinetralkan tuas netralnya',
  'REM PARKIR - Tidak mengaktifkan rem tangan',
  'REM PARKIR - Tidak konfirmasi Rem Tangan OK',
  'GARPU - Badan garpu rata dengan lantai',
  'GARPU - Ujung garpu tidak menempel di lantai',
  'LAMPU - Tidak mematikan lampu',
  'LAMPU - Tidak melakukan konfirmasi lampu mati OK',
  'ENGINE - Tidak mematikan mesin',
  'PENYIMPANAN KUNCI - Tidak melakukan konfirmasi Kunci OK, telah dikembalikan',
  'PENYIMPANAN KUNCI - Kunci tidak ditaruh pada tempatnya',
  'SIKAP AKAN TURUN & KONFIRMASI - Tidak melepas safety belt & tidak konfirmasi saat hendak turun',
  'SIKAP AKAN TURUN & KONFIRMASI - Tidak konfirmasi "OK, OK, OK"',
  'SIKAP AKAN TURUN & KONFIRMASI - Tangan kiri dilepas (tidak pegang handle) saat konfirmasi',
  'SIKAP AKAN TURUN & KONFIRMASI - Tidak memegang handle dan seat saat turun',
  'SIKAP AKAN TURUN & KONFIRMASI - Tidak meletakkan kaki kiri di foot step saat turun',
  'SIKAP AKAN TURUN & KONFIRMASI - Tidak mengangkat tangan dan mengatakan "FINISH"',
];
const s1Plans = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1];

const S2 = [
  'SAAT BERJALAN - Garpu tidak menyentuh kaki box dan stopper bak truck','SAAT BERJALAN - Palet secara penuh masuk ke dalam truck dan tidak tersangkut sisi kanan, sisi kiri, sisi atas, dan sisi bawah','SAAT BERJALAN - Ketinggian garpu forklift 15-20 cm dari lantai','SAAT BERJALAN - Peletakan palet tidak menyimpang dari layoutnya & tidak miring','KONFIRMASI SAAT BERJALAN - Konfirmasi: kiri, depan, kanan & belakang menuju rak kecil','KONFIRMASI SAAT BERJALAN - Saat start memulai gigi satu, tidak melepas hand brake','KONFIRMASI SAAT BERJALAN - Membunyikan klakson sebelum melakukan konfirmasi','KONFIRMASI SAAT BERJALAN - Operasional: naik turun garpu, gigi netral, saat tilt up/down posisi garpu di atas','SAAT BERJALAN - Saat berjalan posisi tangan kanan di atas paha (tidak di atas tuas tilt garpu)','SAAT BERJALAN - Tidak kontak dengan rintangan (patok, obstacle, box, dll)','LOADING - Posisi forklift sejajar dengan palet, saat loading posisi ban center','LOADING - Saat mengambil rak, garpu tidak menabrak palet belakang','LOADING - Menetralkan perseneling saat loading','LOADING - Konfirmasi "NETRAL OK" saat loading','LOADING - Menarik hand brake dan konfirmasi OK','LOADING - Handling palet/skid dengan benar: a. Posisi garpu sejajar dengan lubang palet & tidak kena sisi palet','LOADING - Handling palet/skid dengan benar: b. Tidak menimbulkan suara / bunyi keras','LOADING - Handling palet/skid dengan benar: c. Muatan tidak tergeser saat loading & saat berjalan','LOADING - Handling palet/skid dengan benar: d. Tidak mengangkat palet dengan posisi garpu miring','LOADING - Handling palet/skid dengan benar: e. Tidak meluruskan garpu di atas','LOADING - Handling palet/skid dengan benar: f. Tidak melakukan tilt up/tilt down saat garpu di atas','LOADING - Mengambil rak/palet dua kali proses (3/4 garpu)','LOADING - Rak/palet bersandar pada backrest','LOADING - Tidak konfirmasi sisi kanan/kiri/bawah saat mengambil/menaruh muatan','LOADING - Palet secara penuh masuk ke dalam truck dan tidak tersangkut sisi kanan, sisi kiri, sisi atas, dan sisi bawah','LOADING - Peletakan palet tidak menyimpang dari layoutnya & tidak miring'];
const s2Weights = [2,2,1,2,1,1,1,1,2,4,1,2,1,1,1,1,1,1,2,2,1,2,1,2,2,2];
const s2Plans = [2,2,2,2,8,8,8,8,2,4,3,1,4,4,4,3,3,2,2,2,2,2,2,2,1,1];

const S3 = [...S2.slice(0,10), 'UNLOADING - Tidak melakukan pengaturan lebar garpu forklift (tidak dihitung waktu)','UNLOADING - Posisi forklift sejajar dengan palet, saat loading/unloading posisi ban center','UNLOADING - Menetralkan perseneling saat unloading','UNLOADING - Konfirmasi "NETRAL OK" saat unloading','UNLOADING - Menarik hand brake dan konfirmasi OK','UNLOADING - Handling palet/skid dengan benar: a. Posisi garpu sejajar dengan lubang palet & tidak kena sisi palet','UNLOADING - Handling palet/skid dengan benar: b. Tidak menimbulkan suara / bunyi keras','UNLOADING - Handling palet/skid dengan benar: c. Muatan tidak tergeser saat unloading & saat berjalan','UNLOADING - Handling palet/skid dengan benar: d. Tidak mengangkat palet dengan posisi garpu miring','UNLOADING - Handling palet/skid dengan benar: e. Tidak meluruskan garpu di atas','UNLOADING - Handling palet/skid dengan benar: f. Tidak melakukan tilt up/tilt down saat garpu di atas','UNLOADING - Mengambil rak/palet dua kali proses (3/4 garpu)','UNLOADING - Rak/palet bersandar pada backrest','UNLOADING - Tidak konfirmasi sisi kanan/kiri/bawah saat mengambil/menaruh muatan','UNLOADING - Palet secara penuh masuk ke dalam truck dan tidak tersangkut sisi kanan, sisi kiri, sisi atas, dan sisi bawah','UNLOADING - Peletakan palet tidak menyimpang dari layoutnya & tidak miring','UNLOADING - Saat mengambil rak, garpu tidak menabrak palet belakang'];
const s3Weights = [2,2,1,2,1,1,1,1,2,4,1,1,1,1,1,1,1,1,2,2,1,2,1,2,2,2,2];
const s3Plans = [2,2,2,2,8,8,8,8,2,4,3,3,4,4,4,3,3,2,2,2,2,2,2,2,1,1,1];

export const FORKLIFT_REFRESHMENT_SECTIONS: ForkliftRefreshmentSection[] = [
  { id: 'S1', code: 'S1', name: 'SUB JOB 1: PERSIAPAN MENGHIDUPKAN FORKLIFT', totalPoint: 44, items: S1.map((label, i) => item('S1', i + 1, label, 1, s1Plans[i])) },
  { id: 'S2', code: 'S2', name: 'SUB JOB 2: LOADING RAK KECIL', totalPoint: 115, items: S2.map((label, i) => item('S2', i + 1, label, s2Weights[i], s2Plans[i])) },
  { id: 'S3', code: 'S3', name: 'SUB JOB 3: UNLOADING RAK KECIL', totalPoint: 118, items: S3.map((label, i) => item('S3', i + 1, label, s3Weights[i], s3Plans[i])) },
];

export function calculateForkliftRefreshmentTimePenalty(elapsedSeconds: number): number {
  if (elapsedSeconds <= FORKLIFT_REFRESHMENT_STANDARD_TIME_SECONDS) return 0;
  if (elapsedSeconds > FORKLIFT_REFRESHMENT_MAX_TIME_SECONDS) return 0;
  return Math.ceil((elapsedSeconds - FORKLIFT_REFRESHMENT_STANDARD_TIME_SECONDS) / 30);
}

export function determineForkliftRefreshmentResult(score: number, elapsedSeconds: number): 'PASS' | 'FAIL' | 'DISQUALIFIED' {
  if (elapsedSeconds > FORKLIFT_REFRESHMENT_MAX_TIME_SECONDS) return 'DISQUALIFIED';
  return score >= FORKLIFT_REFRESHMENT_PASSING_SCORE ? 'PASS' : 'FAIL';
}

export function calculateForkliftRefreshmentScore(frequencies: Record<string, number>, elapsedSeconds: number) {
  let totalDeduction = 0;
  const sectionScores = FORKLIFT_REFRESHMENT_SECTIONS.map((section) => {
    const deduction = section.items.reduce((sum, current) => sum + Math.min(current.plan, Math.max(0, frequencies[current.id] || 0)) * current.deduction, 0);
    totalDeduction += deduction;
    return { sectionId: section.code, deduction, unansweredCount: 0 };
  });
  const timePenalty = calculateForkliftRefreshmentTimePenalty(elapsedSeconds);
  const rawScore = ((FORKLIFT_REFRESHMENT_BASE_SCORE - totalDeduction) / FORKLIFT_REFRESHMENT_BASE_SCORE) * 100;
  const score = Math.max(0, Math.round(rawScore) - timePenalty);
  return { totalPoint: FORKLIFT_REFRESHMENT_BASE_SCORE, totalDeduction, actual: Math.max(0, FORKLIFT_REFRESHMENT_BASE_SCORE - totalDeduction), score, result: determineForkliftRefreshmentResult(score, elapsedSeconds), sectionScores, timePenalty, elapsedSeconds };
}
