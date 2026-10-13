const { query } = require('../config/database');

const DDT_SECTIONS = {
  A: { totalPoint: 40, name: 'PTI' },
  B1: { totalPoint: 12, name: 'Slalom' },
  B2: { totalPoint: 9, name: 'Seri' },
  B3: { totalPoint: 9, name: 'Parallel Parking' },
  B4: { totalPoint: 30, name: 'Driving Behavior' },
};

const DDT_TOTAL_POINT = 100;
const PASS_THRESHOLD = 70;

async function createAssessment(data) {
  // data contains: header (participant info), assessmentType, sections, answers

  if (data.assessmentType !== 'DDT' && data.assessmentType !== 'TMMIN') {
    throw new Error('Invalid or unsupported assessment type');
  }

  // Recalculate score based on answers to prevent frontend manipulation
  let totalDeduction = 0;
  let actualPoint = 0;
  let score = 0;
  let result = '';
  const sectionResults = [];

  if (data.assessmentType === 'DDT') {
    for (const [sectionCode, sectionConf] of Object.entries(DDT_SECTIONS)) {
      const reqSection = data.sections.find(s => s.sectionId === sectionCode);
      let sectionDeduction = 0;
      
      if (reqSection && reqSection.items) {
        for (const item of reqSection.items) {
          if (item.answer === 'NO') {
            sectionDeduction += (parseInt(item.deductionPoint, 10) || 0);
          }
        }
      }

      const sectionActual = Math.max(0, sectionConf.totalPoint - sectionDeduction);
      totalDeduction += sectionDeduction;

      sectionResults.push({
        sectionCode,
        sectionName: sectionConf.name,
        totalPoint: sectionConf.totalPoint,
        totalDeduction: sectionDeduction,
        actualPoint: sectionActual,
        items: reqSection ? reqSection.items : []
      });
    }

    actualPoint = Math.max(0, DDT_TOTAL_POINT - totalDeduction);
    score = (actualPoint / DDT_TOTAL_POINT) * 100;
    result = score >= PASS_THRESHOLD ? 'PASS' : 'FAIL';
  } else if (data.assessmentType === 'TMMIN') {
    // TMMIN has complex timer/overtime rules calculated on frontend
    if (!data.scoreResult) {
      throw new Error('Missing scoreResult payload for TMMIN');
    }
    
    totalDeduction = data.scoreResult.totalDeduction || 0;
    actualPoint = data.scoreResult.actual || 0;
    score = data.scoreResult.score || 0;
    result = data.scoreResult.result || 'FAIL';

    for (const sec of data.sections) {
      let secDed = 0;
      if (sec.items) {
        for (const item of sec.items) {
          secDed += (parseInt(item.deductionPoint, 10) || 0);
        }
      }
      sectionResults.push({
        sectionCode: sec.sectionId,
        sectionName: sec.sectionId,
        totalPoint: 0,
        totalDeduction: secDed,
        actualPoint: 0,
        items: sec.items || []
      });
    }
  }

  // DB Transaction
  await query('BEGIN');
  try {
    const assessmentQuery = `
      INSERT INTO assessments (
        assessment_type, assessment_date, participant_name, age,
        sim_category, sim_issue_date, sim_expiry_date, vehicle_type,
        license_plate, test_location, instructor, total_point,
        total_deduction, actual_point, score, result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `;
    const header = data.header;
    const assessmentValues = [
      data.assessmentType,
      header.tanggal,
      header.namaPeserta,
      header.umur,
      header.golSIM,
      "-",
      header.masaBerlakuSIM,
      header.jenisKendaraan,
      header.noPolisi,
      header.lokasiTest,
      header.instruktur,
      data.assessmentType === 'TMMIN' ? 134 : DDT_TOTAL_POINT,
      totalDeduction,
      actualPoint,
      score,
      result
    ];
    
    const resAssessment = await query(assessmentQuery, assessmentValues);
    const assessmentId = resAssessment.rows[0].id;

    for (const sr of sectionResults) {
      const secQuery = `
        INSERT INTO assessment_sections (
          assessment_id, section_code, section_name,
          total_point, total_deduction, actual_point
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const secValues = [assessmentId, sr.sectionCode, sr.sectionName, sr.totalPoint, sr.totalDeduction, sr.actualPoint];
      const resSec = await query(secQuery, secValues);
      const sectionId = resSec.rows[0].id;

      for (const item of sr.items) {
        if (item.answer !== null && item.answer !== undefined) {
          const ansQuery = `
            INSERT INTO assessment_answers (
              assessment_id, section_id, item_id, answer, deduction_point
            ) VALUES ($1, $2, $3, $4, $5)
          `;
          const ansValues = [assessmentId, sectionId, item.itemId, String(item.answer), parseInt(item.deductionPoint, 10) || 0];
          await query(ansQuery, ansValues);
        }
      }
    }

    await query('COMMIT');
    return {
      id: assessmentId,
      actualPoint,
      score,
      result,
      totalDeduction
    };
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

async function getAssessments(limit = 50, offset = 0) {
  const q = `SELECT * FROM assessments ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
  const result = await query(q, [limit, offset]);
  return result.rows;
}

async function getAssessmentById(id) {
  const assessmentRes = await query(`SELECT * FROM assessments WHERE id = $1`, [id]);
  if (assessmentRes.rows.length === 0) return null;
  const assessment = assessmentRes.rows[0];

  const sectionsRes = await query(`SELECT * FROM assessment_sections WHERE assessment_id = $1`, [id]);
  const answersRes = await query(`SELECT * FROM assessment_answers WHERE assessment_id = $1`, [id]);

  return {
    ...assessment,
    sections: sectionsRes.rows.map(sec => ({
      ...sec,
      answers: answersRes.rows.filter(ans => ans.section_id === sec.id)
    }))
  };
}

module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById
};
