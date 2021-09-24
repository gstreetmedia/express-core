
module.exports = (tableName) => {
	class Model extends ModelBase{
		get tableName() {
			return tableName
		}

	}

	let router = require('express').Router();
	const fs = require("fs");
	const path = require("path");
	let authentication = require('../middleware/authentication');
	let Controller = require("../controller/ControllerBase");
	let ModelBase = require("../model/ModelBase");
	let c;

	router.use(authentication);

	router.use(async function(req, res, next){
		req.roleManager.allowRole('super-api');
		if (!c) {
			c = new Controller(ModelBase);
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
};
