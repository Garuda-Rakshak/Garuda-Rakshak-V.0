'use strict';

const router = require('express').Router();
const ctrl   = require('../controllers/ml.controller');

// Public ML and dataset endpoints
router.get('/datasets', ctrl.getDatasetsInfo);
router.get('/dataset/:type', ctrl.getDatasetRows);
router.post('/predict', ctrl.predictTelemetry);

module.exports = router;
