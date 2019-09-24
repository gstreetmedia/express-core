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
	authentication(req, res);
	if (req.hasRole("super-admin")) {
		return res.redirect("/admin");
	}
	return viewSelector(res, 'index', {});
});

router.get('/admin/login', async (req, res, next) => {
	authentication(req, res);
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

router.get("/schema/:name", async function (req, res, next) {
	console.log("get schema");
	if (fs.existsSync(global.appRoot + "/src/schema/" + req.params.name + "-schema.js")) {
		let schema = require("../../schema/" + req.params.name + "-schema");
		return res.status(200).send({
			success: true,
			results: schema
		})
	} else {
		return res.status(404).send("Unknown");
	}
});


module.exports = router;