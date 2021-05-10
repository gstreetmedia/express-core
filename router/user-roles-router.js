let router = require('express').Router();
const fs = require("fs");
const path = require("path");
let authentication = require('../middleware/authentication');

let Controller;
if (!fs.existsSync(path.resolve(global.appRoot + "/src/controller/UserRoleController.js"))) {
	Controller = require('../controller/RoleController');
} else {
	Controller = require(global.appRoot + "/src/controller/UserRoleController");
}
let c = new Controller();

router.use(authentication);

router.use(async function (req, res, next) {
	req.allowRole('api-user');
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

