'use strict';
const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/shelter.controller');

// All shelter routes require authentication
router.use(authenticate);

router.post('/',      requireRole('engineer', 'admin'), ctrl.create);
router.get('/',       ctrl.list);
router.get('/:id',    ctrl.getById);
router.put('/:id',    requireRole('engineer', 'admin'), ctrl.update);
router.delete('/:id', requireRole('admin'),             ctrl.remove);

module.exports = router;
