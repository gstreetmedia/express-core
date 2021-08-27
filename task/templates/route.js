module.exports = (ControllerName, EndPointName) => {
	return `
let router = require('express').Router();
let authentication = require('../middleware/authentication');
let c;

router.use(authentication);

router.use(async function (req, res, next) {
	req.allowRole('api-user');
	if (!c) {
		const Controller = require('../controller/${ControllerName}Controller');
		c = new Controller();
	}
	return next();
});

router.get('/', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.query(req, res);
	}
	return next();
});

router.get('/:id', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.read(req, res);
	}
	return next();
});

router.post('/', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.create(req, res);
	}
	return next();
});

router.put('/:id', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.update(req, res);
	}
	return next();
});

router.delete('/:id', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.destroy(req, res);
	}
	return next();
});

module.exports = router;	
	
	`
};
