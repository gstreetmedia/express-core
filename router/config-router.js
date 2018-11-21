let router = require('express').Router();
let authentication = require('../middleware/authentication');
const Controller = require('../controller/ConfigController');
let c = new Controller()

router.use(authentication);

router.use(async function(req, res, next){
	req.allowRole('api-user');
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints 
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
		return await c.delete(req, res);
	}
	return next();
});

module.exports = router;