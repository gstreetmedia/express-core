const ModelBase = require("../model/ModelBase");
const getController = require("../helper/get-controller");
const getModel = require("../helper/get-model");
const inflectFromTable = require("../helper/inflect-from-table");
const authentication = require("../helper/get-middleware")("authentication");
/**
 * @param {string} tableName
 * @param {Router} [router]
 * @returns {Router}
 */
module.exports = (tableName, router) => {

	router = router || require('express').Router();

	let Controller = getController(inflectFromTable.controllerName(tableName));
	let ActualModel = getModel(inflectFromTable.modelName(tableName));
	if (!Controller) {
		Controller = require("../controller/ControllerBase");
	}
	//If no model is defined, we'll use the base model
	class Model extends ModelBase {
		get tableName() {
			return tableName;
		}
	}

	router.use(authentication);
	let c;

	router.use(async function(req, res, next){
		req.roleManager.allowRole(process.env.CORE_SUPER_USER_ROLE || ['super-api','super-admin']);
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

	router.delete('/:id', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.destroy(req, res);
		}
		return next();
	});

	router.delete('/', async function (req, res, next) {
		if(req.roleManager.checkRole()){
			return await c.destroyWhere(req, res);
		}
		return next();
	});

	return router;
};
