let router = require('express').Router();
let authentication = require('../middleware/authentication');
const Controller = require('../controller/AdminController');
const viewSelector = require("../helper/view/view-selector");
let c = new Controller()

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
	return viewSelector(res, 'page-login', {});
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

router.get("/schema-list",
	async ()=> {
		return await c.schemeList(req, res);
	})

module.exports = router;
