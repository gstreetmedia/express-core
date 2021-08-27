let router = require('express').Router();
let authentication = require('../middleware/authentication');
let UserController = require("../../controller/UserController");
let getView = require("../helper/view/get-view");
let renderView = require("../helper/view/render-view");

router.get('/', async (req, res, next) => {
	await authentication(req, res);
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	let view = await getView('index');
	return res.send(await renderView(view, {req:req}))
});

router.post("/login", async (req, res, next) => {
	let c = new UserController();
	return await c.login(req, res);
});

module.exports = router;
