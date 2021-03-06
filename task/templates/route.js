module.exports = (ControllerName, EndPointName) => {
	return `
let router = require('express').Router();
let authentication = require('../core/middleware/authentication');
const Controller = require('../controller/${ControllerName}Controller');
let c = new Controller()

router.use(authentication);

router.use(async function (req, res, next) {
	req.allowRole('api-user');
	return next();
});


router.get('/index', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.index(req, res);
	}
	return next();
});


router.get('/search', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.search(req, res);
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