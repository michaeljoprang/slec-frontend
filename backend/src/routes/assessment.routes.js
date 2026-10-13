const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');

router.post('/', assessmentController.create);
router.get('/', assessmentController.list);
router.get('/:id', assessmentController.getById);

module.exports = router;
