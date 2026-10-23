function validateAssessmentPayload(data) {
  const errors = [];

  const validTypes = ['DDT', 'TMMIN', 'TMMIN_STANDARD', 'TMMIN_REFRESHMENT'];
  if (!data.assessmentType || !validTypes.includes(data.assessmentType)) {
    errors.push('Invalid or missing assessmentType. Expected: DDT, TMMIN, TMMIN_STANDARD, or TMMIN_REFRESHMENT');
  }

  if (!data.header || typeof data.header !== 'object') {
    errors.push('Missing or invalid header data');
  } else {
    const requiredHeaderFields = [
      'tanggal', 'namaPeserta', 'umur', 'golSIM', 'masaBerlakuSIM',
      'jenisKendaraan', 'noPolisi', 'lokasiTest', 'instruktur'
    ];
    for (const field of requiredHeaderFields) {
      if (!data.header[field] || typeof data.header[field] !== 'string' || data.header[field].trim() === '') {
        errors.push(`Missing required header field: ${field}`);
      }
    }
  }

  if (!data.sections || !Array.isArray(data.sections)) {
    errors.push('Missing or invalid sections array');
  } else {
    for (const section of data.sections) {
      if (!section.sectionId) {
        errors.push('Section missing sectionId');
      }
      if (section.items && !Array.isArray(section.items)) {
        errors.push(`Invalid items array in section ${section.sectionId}`);
      }
      if (section.items) {
        for (const item of section.items) {
          if (!item.itemId) {
            errors.push(`Missing itemId in section ${section.sectionId}`);
          }
          if (data.assessmentType === 'DDT') {
            if (item.answer && item.answer !== 'YES' && item.answer !== 'NO') {
              errors.push(`Invalid answer value for item ${item.itemId}: ${item.answer}`);
            }
            if (item.answer === 'NO' && (item.deductionPoint === undefined || isNaN(parseInt(item.deductionPoint, 10)))) {
              errors.push(`Missing or invalid numeric deductionPoint for NO answer on item ${item.itemId}`);
            }
          } else if (data.assessmentType === 'TMMIN' || data.assessmentType === 'TMMIN_STANDARD' || data.assessmentType === 'TMMIN_REFRESHMENT') {
            if (item.answer && isNaN(parseInt(item.answer, 10))) {
              errors.push(`Invalid numeric answer value for item ${item.itemId}: ${item.answer}`);
            }
            if (item.deductionPoint === undefined || isNaN(parseInt(item.deductionPoint, 10))) {
              errors.push(`Missing or invalid numeric deductionPoint for item ${item.itemId}`);
            }
          }
        }
      }
    }
  }

  return errors;
}

module.exports = {
  validateAssessmentPayload
};
