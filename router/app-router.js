let router = require('express').Router();
const configRouter = require('./config-router');
const fieldsRouter = require('./field-router');
const schemasRouter = require('./schema-router');
const sessionsRouter = require('./sessions-router');
const tokensRouter = require('./tokens-router');
const usersRouter = require('./users-router');

router.use('/field', fieldsRouter);
router.use('/schema', schemasRouter);
router.use('/session', sessionsRouter);
router.use('/config', configRouter);
router.use('/token', tokensRouter);
router.use('/user', usersRouter);


module.exports = router;
