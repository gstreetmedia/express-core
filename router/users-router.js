let router = require('express').Router();
let authentication = require('../middleware/authentication');

const Controller = require('../controller/UserController');
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
	req.allowRole("user");
	if(req.checkRole()){
		return await c.lostPasswordStart(req, res);
	}
	return next();
});

router.put('/lost-password', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.lostPasswordComplete(req, res);
	}
	return next();
});

router.post('/update-email', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.updateEmailComplete(req, res);
	}
	return next();
});

router.put('/update-email', async function (req, res, next) {
	req.allowRole("user");
	if(req.checkRole()){
		return await c.updateEmailComplete(req, res);
	}
	return next();
});

router.get('/index', async function (req, res, next) {
	if(req.checkRole()){
		return await c.index(req, res);
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