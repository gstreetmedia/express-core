let router = require('express').Router();
let getController = require("../helper/get-controller");
let authentication = require('../helper/get-middleware')('authentication');
const getView = require("../helper/get-view");
const ViewObject = require("../object/ViewObject");
let c;

router.use(authentication);

router.use(async function (req, res, next) {
	req.roleManager.allowRole('super-admin');
	if (!c) {
		const Controller = getController("AdminController");
		c = new Controller();
	}
	return next();
});

router.get('/', async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.home(req, res);
	}
	return res.redirect("/");
});

router.get('/login', async (req, res, next) => {
	console.log("Admin login");
	req.roleManager.allowRole("guest");
	if (req.roleManager.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	let o = new ViewObject(
		{
			req: req
		}
	)
	let view = await getView('page-login', true);
	return res.send(await view(o))
});



router.get("/fields/:tableName", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.fields(req, res);
	}
	return res.redirect("/");
});

router.get("/fields", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.fields(req, res);
	}
	return res.redirect("/");
});

router.get("/search/:tableName", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.search(req, res);
	}
	return res.redirect("/");
});

router.post("/fields/:tableName", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.fieldsUpdate(req, res);
	}
	return res.redirect("/");
});

router.get("/page/:view", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.page(req, res);
	}
	return res.redirect("/");
});

router.get("/:tableName", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		let response = await c.index(req, res);
		if (!response) {
			return;
		}
	}
	return res.redirect("/");
});

router.get("/:tableName/create", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.create(req, res);
	}
	return res.redirect("/");
});

router.get("/:tableName/:id/view", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.view(req, res);
	}
	return res.redirect("/");
});

router.get("/:tableName/:id/edit", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.edit(req, res);
	}
	return res.redirect("/");
});

router.get("/search/:tableName", async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.search(req, res);
	}
	return res.redirect("/");
});

module.exports = router;
