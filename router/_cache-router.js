const CacheableBase = require("../object/CacheableBase");
let router = require('express').Router();

router.get("/cache-reset/:startsWith",
	async (req, res, next) => {
		let cacheableBase = new CacheableBase();
		await cacheableBase.cacheManager.reset(req.params.startsWith);
		res.send("OK");
	}
);

router.get("/cache-reset",
	async (req, res, next) => {
		let cacheableBase = new CacheableBase();
		await cacheableBase.cacheManager.reset();
		res.send("OK");
	}
);

module.exports = router;