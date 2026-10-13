const { getPool, closePool } = require('./src/config/database');
const http = require('http');

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const testData = [
  // 1: PASS with high score
  { type: 'DDT', date: '2025-12-15', participant: 'Alpha User', loc: 'HQ-Test', instructor: 'Inst-John', pt: 100, ded: 5, act: 95, score: 95, res: 'PASS' },
  // 2: PASS with medium score
  { type: 'DDT', date: '2026-01-10', participant: 'Beta User', loc: 'HQ-Test', instructor: 'Inst-John', pt: 100, ded: 25, act: 75, score: 75, res: 'PASS' },
  // 3: FAIL
  { type: 'DDT', date: '2026-02-05', participant: 'Gamma User', loc: 'Site-A', instructor: 'Inst-Jane', pt: 100, ded: 50, act: 50, score: 50, res: 'FAIL' },
  // 4: PASS high, different instructor, different month
  { type: 'DDT', date: '2026-02-20', participant: 'Alpha User', loc: 'Site-B', instructor: 'Inst-Jane', pt: 100, ded: 10, act: 90, score: 90, res: 'PASS' },
  // 5: FAIL, different location
  { type: 'DDT', date: '2026-03-01', participant: 'Delta User', loc: 'Site-B', instructor: 'Inst-Mark', pt: 100, ded: 60, act: 40, score: 40, res: 'FAIL' },
];

async function run() {
  let pool;
  let ids = [];
  try {
    console.log("Connecting to DB...");
    pool = getPool();

    console.log("Seeding data...");
    for (const d of testData) {
      const q = `
        INSERT INTO assessments (
          assessment_type, assessment_date, participant_name, test_location,
          instructor, total_point, total_deduction, actual_point, score, result,
          age, sim_category, sim_issue_date, sim_expiry_date, vehicle_type, license_plate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;
      const res = await pool.query(q, [
        d.type, d.date, d.participant, d.loc, d.instructor,
        d.pt, d.ded, d.act, d.score, d.res,
        '30', 'B2', '2020-01-01', '2030-01-01', 'Hino', 'B-123-CD'
      ]);
      const id = res.rows[0].id;
      ids.push(id);

      // Add dummy sections and answers
      const secQ = `
        INSERT INTO assessment_sections (
          assessment_id, section_code, section_name, total_point, total_deduction, actual_point
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const sRes = await pool.query(secQ, [id, 'SEC1', 'Section 1', 100, d.ded, d.act]);
      const secId = sRes.rows[0].id;

      const ansQ = `
        INSERT INTO assessment_answers (
          assessment_id, section_id, item_id, answer, deduction_point
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(ansQ, [id, secId, 'item-1', 'YES', 0]);
    }

    console.log(`Successfully seeded ${ids.length} records. IDs: ${ids.join(', ')}`);

    // Verify API
    console.log("Verifying API /api/monitoring/summary...");
    const summary = await fetchJSON('http://localhost:5000/api/monitoring/summary');
    
    if (summary.summary.totalAssessments < 5) {
      throw new Error("API returned fewer assessments than seeded.");
    }
    console.log("Global Summary API test passed.", JSON.stringify(summary.summary));

    console.log("Verifying API Date Filter...");
    const filtered = await fetchJSON('http://localhost:5000/api/monitoring/summary?from=2026-02-01&to=2026-02-28');
    const filteredTotal = filtered.summary.totalAssessments;
    console.log("Filtered total:", filteredTotal);
    if (filteredTotal !== 2) {
       console.warn(`Expected 2 records in Feb 2026, found ${filteredTotal}`);
    }

    console.log("Done.");
  } catch(e) {
    console.error("Failed:", e);
    process.exit(1);
  } finally {
    if (pool) await closePool();
  }
}

run();
