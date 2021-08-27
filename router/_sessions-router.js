let router = require('express').Router();
const fs = require("fs");
const path = require("path");
let authentication = require('../middleware/authentication');
let Controller;
if (!fs.existsSync(path.resolve(global.appRoot + "/src/controller/SessionController.js"))) {
	Controller = require('../controller/SessionController');
} else {
	Controller = require(global.appRoot + "/src/controller/SessionController");
}
let c;
router.use(authentication);

router.use(async function(req, res, next){
	req.allowRole('super-api');
	if (!c) {
		c = new Controller();
	}
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints
	return next();
});

router.get('/', async function (req, res, next) {
	if(req.checkRole()){
		return await c.query(req, res);
	}
	return next();
});

router.get('/:id', async function (req, res, next) {
	if(req.checkRole()){
		return await c.read(req, res);
	}
	return next();
});

router.post('/', async function (req, res, next) {
	if(req.checkRole()){
		return await c.create(req, res);
	}
	return next();
});

router.put('/:id', async function (req, res, next) {
	if(req.checkRole()){
		return await c.update(req, res);
	}
	return next();
});

router.patch('/:id', async function (req, res, next) {
	if(req.checkRole()){
		return await c.update(req, res);
	}
	return next();
});

router.delete('/:id', async function (req, res, next) {
	if(req.checkRole()){
		return await c.destroy(req, res);
	}
	return next();
});

module.exports = router;
