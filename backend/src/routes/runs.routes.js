'use strict';
const router  = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl    = require('../controllers/runs.controller');
const rptCtrl = require('../controllers/report.controller');

router.use(authenticate);

router.get('/',           ctrl.list);
router.get('/:id',        ctrl.getById);
router.get('/:id/report/pdf',  rptCtrl.downloadPdf);
router.get('/:id/report/apdl', rptCtrl.downloadApdl);

module.exports = router;
