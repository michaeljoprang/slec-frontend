const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://slec_user:slec_password@localhost:5432/slec',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getPool: () => pool,
};
