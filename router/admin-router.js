let router = require('express').Router();
let authentication = require('../middleware/authentication');
const Controller = require('../controller/AdminController');
let c = new Controller()

router.use(authentication);

router.use(async (req, res, next) => {
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints
	return next();
});

router.get('/', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.home(req, res);
	}
	return res.redirect("/");
});

router.get("/:model", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.index(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/create", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.create(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/:id/view", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.view(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/:id/edit", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.edit(req, res);
		}
		return res.redirect("/");
	}
);


module.exports = router;