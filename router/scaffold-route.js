const ModelBase = require("../model/ModelBase");
const getController = require("../helper/get-controller");
const getModel = require("../helper/get-model");
const inflectFromTable = require("../helper/inflect-from-table");

/**
 * @param {string} tableName
 * @param {Router} [router]
 * @returns {Router}
 */
module.exports = (tableName, router) => {


	router = router || require('express').Router();
	let authentication = require('../middleware/authentication');
	let Controller = getController(inflectFromTable.controllerName(tableName));
	let ActualModel = getModel(inflectFromTable.modelName(tableName));
	if (!Controller) {
		Controller = require("../controller/ControllerBase");
	}
	class Model extends ModelBase {
		get tableName() {
			return tableName;
		}
	}

	router.use(authentication);

	router.use(async function(req, res, next){
		req.roleManager.allowRole('super-api');
		if (!c) {
			c = new Controller(ActualModel || Model);
		}
		//add other roles as needed, or call req.roleManager.addRole('some-role') in individual endpoints
		return next();
	});

	router.get('/', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.query(req, res);
		}
		return next();
	});

	router.get('/:id', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.read(req, res);
		}
		return next();
	});

	router.post('/', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.create(req, res);
		}
		return next();
	});

	router.put('/:id', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.update(req, res);
		}
		return next();
	});

	router.patch('/:id', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.update(req, res);
		}
		return next();
	});

	router.delete('/:id', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.destroy(req, res);
		}
		return next();
	});

	return router;
};
