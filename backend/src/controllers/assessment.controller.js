const assessmentService = require('../services/assessment.service');
const { validateAssessmentPayload } = require('../validators/assessment.validator');

async function create(req, res) {
  try {
    const data = req.body;
    const validationErrors = validateAssessmentPayload(data);

    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors });
    }

    const result = await assessmentService.createAssessment(data);
    res.status(201).json({ message: 'Assessment created successfully', data: result });
  } catch (error) {
    console.error('Error creating assessment:', error);
    if (error.message.includes('Invalid or unsupported assessment type')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function list(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const assessments = await assessmentService.getAssessments(limit, offset);
    res.status(200).json({ data: assessments, page, limit });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    // UUID basic validation regex
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }

    const assessment = await assessmentService.getAssessmentById(id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.status(200).json({ data: assessment });
  } catch (error) {
    console.error('Error fetching assessment by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  create,
  list,
  getById
};
