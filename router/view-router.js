let router = require('express').Router();
let authentication = require('../middleware/authentication');
let UserController = require("../../controller/UserController");
let viewSelector = require("../helper/view/view-selector");

router.use(
	async (req, res, next) => {
		return next();
	}
);

router.get('/', async (req, res, next) => {
	authentication(req, res, next);
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	return viewSelector(res, 'index', {});
});

router.get('/admin/login', async (req, res, next) => {
	authentication(req, res, next);
	req.allowRole("guest");
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	return viewSelector(res, 'page-login', {});
});

router.post("/login", async (req, res, next) => {
	let c = new UserController();
	return await c.login(req, res);
});

module.exports = router;