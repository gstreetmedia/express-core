let router = require('express').Router();
let getController = require("../helper/get-controller");
let authentication = require('../middleware/authentication');
const getView = require("../helper/view/get-view");
const ViewObject = require("../model/objects/ViewObject");
let c;

router.use(authentication);

router.use(async function (req, res, next) {
	req.roleManager.allowRole('super-admin');
	const Controller = getController("AdminController");
	c = new Controller();
	return next();
});


router.get('/login', async (req, res, next) => {
	console.log("Admin login");
	req.roleManager.allowRole("guest");
	if (req.roleManager.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	let o = new ViewObject(
		{
			req : req
		}
	)
	let view = await getView('page-login', true);
	return res.send(await view(o))
});

router.get('/', async (req, res, next) => {
	if (req.roleManager.checkRole()) {
		return await c.home(req, res);
	}
	return res.redirect("/");
});

router.get("/fields/:model", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.fields(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/fields", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.fields(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/search/:model", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.search(req, res);
		}
		return res.redirect("/");
	}
);

router.post("/fields/:model", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.fieldsUpdate(req, res);
		}
		return res.redirect("/");
	}
);


router.get("/:model", async (req, res, next) => {
		console.log("Admin Get View");

		if (req.roleManager.checkRole()) {
			return await c.index(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/create", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.create(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/:id/view", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.view(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/:model/:id/edit", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.edit(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/search/:controller", async (req, res, next) => {
		if (req.roleManager.checkRole()) {
			return await c.search(req, res);
		}
		return res.redirect("/");
	}
);




module.exports = router;
