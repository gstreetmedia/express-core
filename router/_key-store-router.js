let scaffold = require("./scaffold-route");
let router = scaffold("_key_store");

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

module.exports = router;
