'use strict';
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl  = require('../controllers/auth.controller');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        authenticate, ctrl.getMe);

module.exports = router;
