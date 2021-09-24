let router = require('express').Router();
let authentication = require('../middleware/authentication');
let UserController = require("../../controller/UserController");
let getView = require("../helper/view/get-view");
let renderView = require("../helper/view/render-view");
let ViewObject = require("../model/objects/ViewObject");

router.get('/', async (req, res, next) => {
	await authentication(req, res);
	if (req.roleManager.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	let view = await getView('index');
	let o = new ViewObject(
		{
			req : req
		}
	);
	return res.send(await renderView(view, o))
});

router.post("/login", async (req, res, next) => {
	let c = new UserController();
	return await c.login(req, res);
});

module.exports = router;
