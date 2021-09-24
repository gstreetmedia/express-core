let router = require('express').Router();
let getController = require("../helper/get-controller");
let authentication = require('../middleware/authentication');
let c;

router.use(authentication);

router.use(async function(req, res, next){
	req.roleManager.allowRole('super-admin');
	const Controller = getController("KeyStoreController");
	c = new Controller();
	//add other roles as needed, or call req.roleManager.addRole('some-role') in individual endpoints
	return next();
});

router.get('/key/:key', async function (req, res, next) {
	console.log('get key');
	if(req.roleManager.checkRole()){
		return await c.getKey(req, res);
	}
	return next();
});

router.post('/key/:key', async function (req, res, next) {
	if(req.roleManager.checkRole()){
		return await c.setKey(req, res);
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

router.put('/:id', async (req, res, next) => {
	if (req.roleManager.checkRole()) {
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
