let router = require('express').Router();
let authentication = require('../middleware/authentication');
const fs = require("fs");
const path = require("path");

let Controller;
if (!fs.existsSync(path.resolve(global.appRoot + "/src/controller/UserController.js"))) {
	const Controller = require('../controller/UserController');
} else {
	Controller = require(global.appRoot + "/src/controller/UserController");
}

const rateLimitRoute = require("../helper/rate-limit-route")();
let c = new Controller()

router.use(authentication);

router.use(async function(req, res, next){
	req.allowRole('super-api');
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints
	return next();
});

router.post('/login', async function (req, res, next) {
	req.allowRole("guest");

	if(req.checkRole()){

		const retryAfter = await rateLimitRoute.check("user/login");
		if (retryAfter) {
			await rateLimitRoute.fail("user/login");
			return res.tooManyRequests(retryAfter)
		}

		let result = await c.login(req, res);
		return;
	}
	return next();
});

router.get('/logout', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.logout(req, res);
	}
	return next();
});

router.post('/lost-password', async function (req, res, next) {
	req.allowRole("api-user");
	if(req.checkRole()){
		return await c.lostPasswordStart(req, res);
	}
	return next();
});

router.patch('/lost-password', async function (req, res, next) {
	req.allowRole("api-user");
	if(req.checkRole()){
		return await c.lostPasswordComplete(req, res);
	}
	return next();
});

router.post('/register', async function (req, res, next) {
	req.allowRole("api-user");
	if(req.checkRole()){

		const retryAfter = await rateLimitRoute.check("user/register");
		if (retryAfter) {
			await rateLimitRoute.fail("user/register");
			return res.tooManyRequests(retryAfter)
		}

		return await c.register(req, res);
	}
	return next();
});

router.put('/register', async function (req, res, next) {
	req.allowRole("api-user");
	if(req.checkRole()){
		return await c.registerComplete(req, res);
	}
	return next();
});

router.post('/:id/update-email', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.updateEmailStart(req, res);
	}
	return next();
});

router.patch('/:id/update-email', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.updateEmailComplete(req, res);
	}
	return next();
});

router.post('/:id/update-password', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.updatePassword(req, res);
	}
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

router.patch('/:id', async (req, res, next) => {
	if (req.checkRole()) {
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