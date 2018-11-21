let router = require('express').Router();
let authentication = require('../middleware/authentication');
const ViewController = require('../controller/ViewController');
let vc = new ViewController();

router.use(
	async (req, res, next) => {
		req.allowRole("guest");
		return next();
	}
)

router.get('/', async (req, res, next) => {
	if (req.checkRole()) {
		return res.render(
			'page-login',
			{}
		)
	}
	return next();
});

router.get("/login", async (req, res, next) => {
	if (req.checkRole()) {
			return res.render(
				'page-login',
				{}
			)
		}
		return next();
	}
)

router.get("/schema/:name", async function(req, res, next) {
	console.log("get schema");
	if (fs.existsSync(global.appRoot + "/src/schema/" + req.params.name + "-schema.js")) {
		let schema = require("./src/schema/" + req.params.name + "-schema");
		return res.status(200).send({success:true, results:schema})
	} else {
		return res.status(404).send("Unknown");
	}
});


module.exports = router;