let router = require('express').Router();
const fs = require("fs");
const path = require("path");
let authentication = require('../middleware/authentication');
let Controller;
if (!fs.existsSync(path.resolve(global.appRoot + "/src/controller/AdminController.js"))) {
	Controller = require('../controller/AdminController');
} else {
	Controller = require(global.appRoot + "/src/controller/AdminController");
}
let c = new Controller()
const getView = require("../helper/view/get-view");

router.use(authentication);

router.use(async (req, res, next) => {
	//add other roles as needed, or call req.addRole('some-role') in individual endpoints
	req.allowRole('super-admin')
	return next();
});

router.get('/login', async (req, res, next) => {
	console.log("Admin login");
	req.allowRole("guest");
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	let view = await getView('page-login', true);
	return res.send(await view({req:req}))
});

router.get('/', async (req, res, next) => {
	if (req.checkRole()) {
		return await c.home(req, res);
	}
	return res.redirect("/");
});

router.get("/fields/:model", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.fields(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/fields", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.fields(req, res);
		}
		return res.redirect("/");
	}
);

router.get("/search/:model", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.search(req, res);
		}
		return res.redirect("/");
	}
);

router.post("/fields/:model", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.fieldsUpdate(req, res);
		}
		return res.redirect("/");
	}
);


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

router.get("/search/:controller", async (req, res, next) => {
		if (req.checkRole()) {
			return await c.search(req, res);
		}
		return res.redirect("/");
	}
);




module.exports = router;
