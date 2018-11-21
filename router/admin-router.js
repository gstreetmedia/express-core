let router = require('express').Router();
let authentication = require('../middleware/authentication');
const Controller = require('../controller/AdminController');
let c = new Controller()

router.use(authentication);

router.use(async function(req, res, next){
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints
	return next();
});

router.get('/', async function (req, res, next) {
	return await c.home(req, res);
	return next();
});

router.get("/:model", async function (req, res, next) {
		return await c.index(req, res);
		return next();
	}
);

router.get("/:model/create", async function (req, res, next) {
		return await c.create(req, res);
		return next();
	}
);

router.get("/:model/:id/view", async function (req, res, next) {
		return await c.view(req, res);
		return next();
	}
);

router.get("/:model/:id/edit", async function (req, res, next) {
		return await c.edit(req, res);
		return next();
	}
);


module.exports = router;