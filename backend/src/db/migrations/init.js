const { getPool } = require('../../config/database');

const initSql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_type VARCHAR(50) NOT NULL,
  assessment_date DATE NOT NULL,
  participant_name VARCHAR(255) NOT NULL,
  age VARCHAR(10) NOT NULL,
  sim_category VARCHAR(50) NOT NULL,
  sim_issue_date VARCHAR(50) NOT NULL,
  sim_expiry_date VARCHAR(50) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  license_plate VARCHAR(50) NOT NULL,
  test_location VARCHAR(255) NOT NULL,
  instructor VARCHAR(255) NOT NULL,
  total_point INTEGER NOT NULL,
  total_deduction INTEGER NOT NULL,
  actual_point INTEGER NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  result VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_code VARCHAR(20) NOT NULL,
  section_name VARCHAR(255) NOT NULL,
  total_point INTEGER NOT NULL,
  total_deduction INTEGER NOT NULL,
  actual_point INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  item_id VARCHAR(50) NOT NULL,
  answer VARCHAR(20) NOT NULL,
  deduction_point INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

async function runMigration() {
  const pool = getPool();
  try {
    console.log('Running database migrations...');
    await pool.query(initSql);
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration().then(() => process.exit(0));
}

module.exports = { runMigration };
