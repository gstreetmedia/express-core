let router = require('express').Router();
let authentication = require("../helper/get-middleware")("authentication");
let ViewObject = require("../object/ViewObject");

router.get('/', async (req, res, next) => {
	await authentication(req, res);
	if (req.roleManager.hasRole("super-admin")) {
		return res.redirect("/admin");
	}

	let o = new ViewObject(
		{
			req : req
		}
	);

	let view = await o.getView('index');
	return res.send(await o.renderView(view, o))
});

module.exports = router;
