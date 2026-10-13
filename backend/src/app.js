const express = require('express');
const cors = require('cors');
const assessmentRoutes = require('./routes/assessment.routes');
const { getPool } = require('./config/database');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health Check DB Error:', error);
    res.status(500).json({ status: 'error', db: 'disconnected', error: error.message, timestamp: new Date().toISOString() });
  }
});

app.use('/api/assessments', assessmentRoutes);
app.use('/api/monitoring', require('./routes/monitoring.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
