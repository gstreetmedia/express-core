let router = require('express').Router();
let authentication = require('../middleware/authentication');
let UserController = require("../../controller/UserController");
let viewSelector = require("../helper/view/view-selector");

router.get('/', async (req, res, next) => {
	await authentication(req, res);
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	return viewSelector(res, 'index', {});
});

router.post("/login", async (req, res, next) => {
	let c = new UserController();
	return await c.login(req, res);
});

module.exports = router;