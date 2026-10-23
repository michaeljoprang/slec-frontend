// ============================================================
// SLEC – Shared Utilities
// ============================================================

/**
 * Format a number with thousands separator.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format storage size in MB to a readable string.
 */
export function formatStorageSize(mb: number): string {
  if (mb >= 1000) {
    return `${(mb / 1000).toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

/**
 * Format plat nomor polisi kendaraan Indonesia: [Kode Wilayah]-[Nomor]-[Seri Huruf]
 * Contoh: "b1222djd" -> "B-1222-DJD", "b 1234 cd" -> "B-1234-CD"
 */
export function formatPlatPolisi(input?: string | null): string {
  if (!input) return '—';
  const trimmed = input.trim();
  if (trimmed === '-' || trimmed === '—' || trimmed === '') return '—';

  // Hapus referensi TMMIN jika ada di data lama
  const sanitized = trimmed.replace(/TMMIN[-\s]*/gi, '');

  const cleaned = sanitized.replace(/[\s-]/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  if (match) {
    const [, area, num, series] = match;
    return series ? `${area}-${num}-${series}` : `${area}-${num}`;
  }
  return sanitized.toUpperCase();
}

/**
 * Format nomor body unit forklift / alat berat: [Prefix]-[Nomor]
 * Contoh: "fl01" -> "FL-01", "fl-01" -> "FL-01", "fk02" -> "FK-02"
 */
export function formatNoBody(input?: string | null): string {
  if (!input) return '—';
  const trimmed = input.trim();
  if (trimmed === '-' || trimmed === '—' || trimmed === '') return '—';

  // Hapus referensi TMMIN jika ada di data lama (misal "FL-TMMIN-02" -> "FL-02")
  const sanitized = trimmed.replace(/TMMIN[-\s]*/gi, '');

  const cleaned = sanitized.toUpperCase().replace(/\s+/g, '-');
  const match = cleaned.match(/^([A-Z]+)[-\s]*(\d+.*)$/);
  if (match) {
    const [, prefix, num] = match;
    const cleanNum = num.replace(/^[-\s]+/, '');
    return `${prefix}-${cleanNum}`;
  }

  // Jika hanya angka murni (misal "01" atau "2"), format menjadi FL-XX
  if (/^\d+$/.test(cleaned)) {
    return `FL-${cleaned.padStart(2, '0')}`;
  }

  return cleaned.toUpperCase();
}

/**
 * Alias backward compatibility untuk formatNoBody
 */
export const formatNoLambung = formatNoBody;

/**
 * Helper cerdas untuk memformat plat polisi atau nomor body:
 * - Mendeteksi apakah input nomor body (diawali FL, FK, UNIT, angka murni, atau konteks forklift)
 * - Jika bukan nomor body, format sebagai plat nomor polisi standar
 */
export function formatVehicleIdentifier(
  identifier?: string | null,
  isForklift?: boolean
): string {
  if (!identifier) return '—';
  const trimmed = identifier.trim();
  if (trimmed === '-' || trimmed === '—' || trimmed === '') return '—';

  // Bersihkan referensi TMMIN jika ada di data kendaraan lama
  const sanitized = trimmed.replace(/TMMIN[-\s]*/gi, '');

  // 1. Cek apakah cocok pola nomor body forklift
  const isBodyPattern =
    /^(FL|FK|UNIT|LB|FORKLIFT|SC|SL)[-\s]*\d+/i.test(sanitized) ||
    (isForklift && /^\d+$/.test(sanitized));

  if (isBodyPattern) {
    return formatNoBody(sanitized);
  }

  // 2. Cek apakah cocok pola plat nomor Indonesia (1-2 huruf, 1-4 angka, 0-3 huruf)
  const cleanedPlate = sanitized.replace(/[\s-]/g, '').toUpperCase();
  const isPlatePattern = /^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/.test(cleanedPlate);

  if (isPlatePattern) {
    return formatPlatPolisi(sanitized);
  }

  // 3. Jika dalam konteks forklift dan bukan plat nomor, format sebagai nomor body
  if (isForklift) {
    return formatNoBody(sanitized);
  }

  // 4. Default: format plat nomor jika memungkinkan, atau uppercase rapi
  return formatPlatPolisi(sanitized);
}

/**
 * Helper deteksi apakah jenis asesmen / unit merupakan Forklift
 */
export function isForklift(typeOrObj?: any): boolean {
  if (!typeOrObj) return false;
  if (typeof typeOrObj === 'boolean') return typeOrObj;
  const type = (typeof typeOrObj === 'string' ? typeOrObj : typeOrObj.assessmentType || '').toUpperCase().trim();
  const vehicle = (typeof typeOrObj === 'object' && typeOrObj.vehicleType ? typeOrObj.vehicleType : '').toUpperCase().trim();
  const program = (typeof typeOrObj === 'object' && typeOrObj.trainingProgram ? typeOrObj.trainingProgram : '').toUpperCase().trim();
  return (
    type === 'TMMIN' ||
    type === 'TMMIN_STANDARD' ||
    type === 'TMMIN_REFRESHMENT' ||
    type.includes('FORKLIFT') ||
    vehicle.includes('FORKLIFT') ||
    program.includes('FORKLIFT')
  );
}

export const isForkliftAssessment = isForklift;

/**
 * Membersihkan semua metadata/machine tags internal sistem
 * seperti [SIO Kemnaker: ...], [StartedAt: ...], [FinishedAt: ...], [Status: ...],
 * [FatalError: ...], [Disqualified: ...], [Alasan Diskualifikasi: ...], [Manual Matrix Override: ...],
 * [Draft Batch: ...], [Forklift Refreshment], [Forklift Standard], [DDT], dll.
 * Menyisakan murni catatan yang diketik trainer tanpa artefak metadata sistem.
 */
export function cleanTrainerNotes(rawNotes?: string | null): string {
  if (!rawNotes) return '';

  let cleaned = rawNotes
    // 1. Hapus tag metadata sistem key-value spesifik dalam kurung siku
    .replace(/\[\s*(?:StartedAt|FinishedAt|Status|SIO Kemnaker|SIM|SectionDurations|Disqualified|Alasan Diskualifikasi|FatalError|Manual Matrix Override|Draft Batch|TMMIN|SLEC)[^\]]*\]/gi, '')
    // 2. Hapus tag program training / kategori dalam kurung siku yang disisipkan otomatis
    .replace(/\[\s*(?:Forklift(?:\s*-?\s*(?:Refreshment|Standard))?|DDT|Truck Assessment DDT|Driving)[^\]]*\]/gi, '')
    // 3. Hapus pola umum tag metadata key:value dalam kurung siku jika masih ada sisa
    .replace(/\[\s*[A-Za-z0-9_\s-]+:[^\]]*\]/g, '')
    // 4. Hapus label awalan catatan sinkronisasi
    .replace(/Catatan Kemampuan:\s*/gi, '');

  // 5. Normalisasi baris, spasi, dan peluru pemisah
  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  cleaned = cleaned
    // Normalisasi bullet pemisah berulang
    .replace(/\s*•\s*•\s*/g, ' • ')
    // Bersihkan peluru atau tanda baca pemisah di awal teks
    .replace(/^[\s•\-,:;|]+/, '')
    // Bersihkan peluru atau tanda baca pemisah di akhir teks
    .replace(/[\s•\-,:;|]+$/, '')
    // Rapikan multi spasi
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Jika setelah dibersihkan hanya menyisakan karakter pemisah atau kosong
  if (/^[\s•\-,:;|]*$/.test(cleaned)) {
    return '';
  }

  return cleaned;
}

/**
 * Mengekstrak alasan diskualifikasi fatal / human error dari metadata internal catatan trainer
 */
export function extractDisqualificationReason(rawNotes?: string | null): string | null {
  if (!rawNotes) return null;
  const match = rawNotes.match(/\[\s*(?:FatalError|Disqualified):\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

/**
 * Format nama orang (peserta / instruktur / trainer) menjadi Title Case (huruf kapital di awal kata)
 * Contoh: "fadil" -> "Fadil", "m. rizky pratama" -> "M. Rizky Pratama", "JUYOTO" -> "Juyoto"
 */
export function formatPersonName(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return trimmed || '';

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      // Support sub-delimiters: dots (e.g. M. or Moch.) and hyphens
      return word
        .split(/([.\-])/)
        .map((part) => {
          if (part === '.' || part === '-') return part;
          if (!part) return '';
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
    })
    .join(' ');
}

