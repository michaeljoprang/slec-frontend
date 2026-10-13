const { getPool, closePool } = require('./src/config/database');

async function run() {
  let pool;
  try {
    console.log("Connecting to DB...");
    pool = getPool();

    console.log("Cleaning up E2E test data...");
    
    // We used specific locations/instructors for test data
    const res = await pool.query(`
      DELETE FROM assessments 
      WHERE test_location IN ('HQ-Test', 'Site-A', 'Site-B')
      AND instructor IN ('Inst-John', 'Inst-Jane', 'Inst-Mark')
      RETURNING id
    `);

    const deletedIds = res.rows.map(r => r.id);
    console.log(`Deleted ${deletedIds.length} temporary records: ${deletedIds.join(', ')}`);

    // Verify cascade
    if (deletedIds.length > 0) {
      const secRes = await pool.query('SELECT count(*) FROM assessment_sections WHERE assessment_id = ANY($1)', [deletedIds]);
      const ansRes = await pool.query('SELECT count(*) FROM assessment_answers WHERE assessment_id = ANY($1)', [deletedIds]);
      console.log(`Orphaned sections: ${secRes.rows[0].count}`);
      console.log(`Orphaned answers: ${ansRes.rows[0].count}`);
      if (parseInt(secRes.rows[0].count) > 0 || parseInt(ansRes.rows[0].count) > 0) {
        throw new Error("Orphaned data found!");
      }
    }

    console.log("Done cleanup.");
  } catch(e) {
    console.error("Failed:", e);
    process.exit(1);
  } finally {
    if (pool) pool.end();
  }
}

run();
