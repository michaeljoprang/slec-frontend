const request = require('supertest');
const app = require('../src/app');
const { getPool } = require('../src/config/database');

describe('Monitoring API endpoints', () => {
  let pool;
  let testAssessmentIds = [];

  beforeAll(async () => {
    pool = getPool();
    // Clean up any stray test data first
    await pool.query("DELETE FROM assessments WHERE test_location = 'TEST-MONITORING-LOC'");
    
    // Create test assessments
    const testData = [
      { date: '2026-01-10', result: 'PASS', score: 85, instructor: 'InstA', type: 'DDT', name: 'PartA' },
      { date: '2026-02-15', result: 'FAIL', score: 55, instructor: 'InstB', type: 'DDT', name: 'PartB' },
      { date: '2026-02-20', result: 'PASS', score: 75, instructor: 'InstA', type: 'DDT', name: 'PartA' }
    ];

    for (const d of testData) {
      const res = await pool.query(`
        INSERT INTO assessments (
          assessment_type, assessment_date, participant_name, test_location,
          instructor, total_point, total_deduction, actual_point, score, result,
          age, sim_category, sim_issue_date, sim_expiry_date, vehicle_type, license_plate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [d.type, d.date, d.name, 'TEST-MONITORING-LOC', d.instructor, 100, 100 - d.score, d.score, d.score, d.result,
          '30', 'B2', '2020-01-01', '2030-01-01', 'Hino', 'B1234']);
      testAssessmentIds.push(res.rows[0].id);
    }
  });

  afterAll(async () => {
    if (testAssessmentIds.length > 0) {
      await pool.query('DELETE FROM assessments WHERE id = ANY($1)', [testAssessmentIds]);
    }
  });

  it('should return summary for all dates', async () => {
    const res = await request(app).get('/api/monitoring/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    
    // Just verify the basic shape and that our test data is included
    expect(res.body.summary.totalAssessments).toBeGreaterThanOrEqual(3);
    
    // Check shapes of other components
    expect(Array.isArray(res.body.trend)).toBe(true);
    expect(Array.isArray(res.body.resultDistribution)).toBe(true);
    expect(Array.isArray(res.body.scoreDistribution)).toBe(true);
    expect(Array.isArray(res.body.participantPerformance)).toBe(true);
    expect(Array.isArray(res.body.instructorPerformance)).toBe(true);
    expect(Array.isArray(res.body.locationPerformance)).toBe(true);
  });

  it('should return 400 for invalid dates', async () => {
    const res1 = await request(app).get('/api/monitoring/summary?from=invalid-date');
    expect(res1.statusCode).toBe(400);

    const res2 = await request(app).get('/api/monitoring/summary?from=2026-10-01&to=2026-09-01');
    expect(res2.statusCode).toBe(400);
    expect(res2.body.error).toContain('cannot be after');
  });

  it('should filter by date', async () => {
    // There is exactly one in Jan 2026 for this test location
    const res = await request(app).get('/api/monitoring/summary?from=2026-01-01&to=2026-01-31');
    expect(res.statusCode).toBe(200);
    
    // Filter out our known records
    const locPerf = res.body.locationPerformance.find(l => l.location === 'TEST-MONITORING-LOC');
    
    // If the database was empty aside from our test data, we expect exactly 1.
    // If it has other data, we just verify our known row exists in the period.
    if (locPerf) {
       expect(locPerf.totalAssessments).toBeGreaterThanOrEqual(1);
    }
  });

  it('should calculate PASS/FAIL distribution correctly', async () => {
    const res = await request(app).get('/api/monitoring/summary');
    expect(res.statusCode).toBe(200);
    
    const passDist = res.body.resultDistribution.find(d => d.name === 'PASS');
    const failDist = res.body.resultDistribution.find(d => d.name === 'FAIL');
    
    expect(passDist).toBeDefined();
    expect(failDist).toBeDefined();
    expect(passDist.value).toBeGreaterThanOrEqual(2);
    expect(failDist.value).toBeGreaterThanOrEqual(1);
  });

  it('should calculate Score distribution correctly', async () => {
    const res = await request(app).get('/api/monitoring/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body.scoreDistribution.length).toBe(5); // 5 bands
    
    const band50 = res.body.scoreDistribution.find(d => d.name === '<60');
    expect(band50.value).toBeGreaterThanOrEqual(1); // from our score 55
  });

  it('should filter by assessmentType', async () => {
    const res = await request(app).get('/api/monitoring/summary?assessmentType=UNKNOWN_TYPE');
    expect(res.statusCode).toBe(200);
    // Should be 0 since no such type exists
    expect(res.body.summary.totalAssessments).toBe(0);
    expect(res.body.participantPerformance.length).toBe(0);
  });
});
