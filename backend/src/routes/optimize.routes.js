'use strict';
const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/optimize.controller');

router.use(authenticate);

router.post('/',   requireRole('engineer', 'admin'), ctrl.startOptimization);
router.get('/:id', ctrl.getOptimizationResult);

module.exports = router;
