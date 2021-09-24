let router = require('express').Router();
let getController = require("../helper/get-controller");
let authentication = require('../middleware/authentication');
let c;

router.use(authentication);

router.use(async function (req, res, next) {
	req.roleManager.allowRole('super-admin');
	const Controller = getController("TokenController");
	c = new Controller();
	return next();
});

router.get('/', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.query(req, res);
	}
	return next();
});

router.get('/:id', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.read(req, res);
	}
	return next();
});

router.post('/', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.create(req, res);
	}
	return next();
});

router.put('/:id', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.update(req, res);
	}
	return next();
});

router.patch('/:id', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.update(req, res);
	}
	return next();
});

router.delete('/:id', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.destroy(req, res);
	}
	return next();
});

module.exports = router;
