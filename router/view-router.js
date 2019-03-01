let router = require('express').Router();
let authentication = require('../middleware/authentication');
let fs = require("fs");
let UserController = require("../../controller/UserController");
router.use(
	async (req, res, next) => {
		return next();
	}
)

router.get('/', async (req, res, next) => {
	req.allowRole("guest");

	if(req.hasRole("super-admin")){
		return res.redirect("/admin");
	}

	if (fs.existsSync(global.appRoot + "/src/views/page-login.ejs")) {
		console.log("Render local login")
		return res.render(
			'page-login',
			{}
		)
	} else {
		return res.render(
			'../core/views/page-login',
			{}
		)
	}


	return next();
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