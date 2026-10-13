const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoring.controller');

router.get('/summary', monitoringController.getSummary);

module.exports = router;
