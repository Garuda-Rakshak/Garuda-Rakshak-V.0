'use strict';
const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl  = require('../controllers/simulate.controller');

router.use(authenticate);
router.post('/', requireRole('engineer', 'admin'), ctrl.startSimulation);

module.exports = router;
