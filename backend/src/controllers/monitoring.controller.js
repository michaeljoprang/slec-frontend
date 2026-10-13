const monitoringService = require('../services/monitoring.service');

async function getSummary(req, res) {
  try {
    const { from, to, assessmentType } = req.query;

    // Date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !dateRegex.test(from)) {
      return res.status(400).json({ error: 'Invalid "from" date format. Expected YYYY-MM-DD.' });
    }
    if (to && !dateRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid "to" date format. Expected YYYY-MM-DD.' });
    }
    
    // Additional basic date validity check
    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({ error: 'Invalid "from" date.' });
    }
    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({ error: 'Invalid "to" date.' });
    }

    if (from && to && Date.parse(from) > Date.parse(to)) {
      return res.status(400).json({ error: '"from" date cannot be after "to" date.' });
    }

    const filters = {
      from,
      to,
      assessmentType
    };

    const data = await monitoringService.getSummary(filters);

    res.status(200).json({
      success: true,
      filters,
      ...data
    });
  } catch (error) {
    console.error('Monitoring Summary Error:', error);
    res.status(500).json({ error: 'Failed to retrieve monitoring summary' });
  }
}

module.exports = {
  getSummary
};
