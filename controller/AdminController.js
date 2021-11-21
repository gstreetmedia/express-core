const ViewControllerBase = require('./ViewControllerBase');
const _ = require('lodash');
const fs = require('fs');
const inflector = require("../helper/inflector");
const FieldModel = require("../model/FieldModel");
const SchemaModel = require("../model/SchemaModel");
const ViewObject = require("../model/objects/ViewObject");
const getModel = require("../helper/get-model");
const getController = require("../helper/get-controller");

class AdminController extends ViewControllerBase {

	constructor() {
		super();
	}

	async home(req, res) {
		req.locals.isAdmin = true;
		let schemas = await this.getSchemaList();

		await this.render(
			'page-admin-home',
			new ViewObject({
				schemas : schemas,
				slug : "home",
				action : "home",
				model : {
					schema : {
						title : "Home"
					}
				},
				req : req
			}),
			req,
			res
		);
	}

	/**
	 * Get a list of a model, typically of id's
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async index(req, res) {
		req.locals.isAdmin = true;
		/**
		 * @type {ControllerBase}
		 */
		let Controller = await AdminController.getController(req);
		/**
		 * @type {ModeBase}
		 */
		let Model = await AdminController.getModel(req);

		if (!Controller || !Model) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();
		const tableName = model.tableName;

		let properties = model.properties;
		let rawFields = model.fields ? model.fields.adminIndex : null;

		if (req.query.query) {
			try {
				let q = unescape(req.query.query);
				req.query = JSON.parse(q)
			} catch (e) {
				req.query = {};
			}
		} else {
			req.query = {};
		}

		req.query.select = req.query.select || [];

		rawFields.forEach(
			function(item) {
				if (item.property) {
					let rootName = item.property.split(".")[0]; //allow for nesting into jsonb
					if (item.property && item.visible && properties[rootName]) {
						if (_.isString(req.query.select)) {
							req.query.select = req.query.select.split(",");
						}
						if (req.query.select.indexOf(item.property) === -1) {
							req.query.select.push(item.property);
						}
					}
				}
			}
		);

		if (model.primaryKey && req.query.select.includes(model.schema.primaryKey) === false) {
			req.query.select.unshift(model.primaryKey);
		}

		req.query.limit = req.query.limit || 50;

		if (!req.query.sort) {
			if (model.defaultSort) {
				req.query.sort = model.defaultSort;
			} else if (model.schema.properties.name) {
				req.query.sort = "name ASC";
			} else if (model.schema[model.primaryKey].type === "number") {
				req.query.sort = `${model.primaryKey} DESC`;
			} else if (model.schema.properties.createdAt) {
				req.query.sort = `${model.schema.properties[model.createdAt]} DESC`;
			}
		}

		let data;
		if (controller.adminIndex) {
			data = await controller.adminIndex(req);
			if (data.error) {
				console.log(data.error);
			}
			if (!data) {
				return; //Assume Controller took care of everything
			}
		} else {
			data = await controller.query(req);
		}

		let slug = inflector.dasherize(inflector.singularize(req.params.model));

		return await this.render(
			['page-admin-list-' + inflector.dasherize(model.tableName), 'page-admin-list'],
			new ViewObject({
				model : model,
				data : data,
				schemas : await this.getSchemaList(),
				action : "index",
				query : req.query,
				req : req
			}),
			req,
			res
		)
	}

	/**
	 * Create a new row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async create(req, res) {
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();

		const tableName = model.tableName;

		let data;
		if (controller.adminCreate) {
			//If desired, create items in data for input field options (e.g select)
			data = await controller.adminCreate(req);
		}

		return await this.render(
			['page-admin-add-' + inflector.dasherize(model.tableName), 'page-admin-add'],
			new ViewObject({
				model : model,
				schemas : await this.getSchemaList(),
				action : "create",
				data : data,
				req : req
			}),
			req,
			res
		)
	}

	/**
	 * Read an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async view(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		model.debug = true;
		await model.init();

		const tableName = model.tableName;

		req.query.join = {};
		req.query.joinFieldSet = "adminView";

		let relations = Object.keys(model.relations);
		relations.forEach(
			(key) => {
				if (model.relations[key].where) {
					req.query.join[key] = {where: model.relations[key].where}
				} else {
					req.query.join[key] = true;
				}
			}
		)
		let foreignKeys = Object.keys(model.foreignKeys);
		foreignKeys.forEach(
			(key) => {
				if (model.foreignKeys[key].where) {
					req.query.join[key] = {where: model.foreignKeys[key].where}
				} else {
					req.query.join[key] = {
						debug : true
					};
				}
			}
		)

		let data;
		if (controller.adminView) {
			//If desired, create items in data for input field options (e.g select)
			console.log("get View Data");
			data = await model.read(req.params.id, req.query);
			console.log("got View Data");
		} else {
			data = await controller.read(req);
		}

		if (!data) {
			return res.error(
				{
					message : "Could Not Find Record",
					id : req.params.id,
					statusCode : 404
				}
			)
		}

		return await this.render(
			['page-admin-view-' + inflector.dasherize(model.tableName), 'page-admin-view'],
			new ViewObject({
				model : model,
				data : data,
				schemas : await this.getSchemaList(),
				action : "view",
				req : req
			}),
			req,
			res
		)
	}

	/**
	 * Update / Replace an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async edit(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();

		const tableName = model.tableName;

		let data;
		if (controller.adminUpdate) {
			//If desired, create items in data for input field options (e.g select)
			data = await controller.adminUpdate(req);
		} else {
			data = await controller.read(req);
		}

		/*
		if (model.tableName === "_fields") {
			let TargetModel = await AdminController.getModel({params:{model:data.tableName}});
			return await this.render(
				'page-admin-edit-fields',
				new ViewObject({
					model : model,
					targetModel : new TargetModel(req),
					data : data,
					schemas : await this.getSchemaList(),
					action : "edit",
					req : req
				}),
				req,
				res
			)
		}

		 */

		return await this.render(
			['page-admin-edit-' + inflector.dasherize(model.tableName), 'page-admin-edit'],
			new ViewObject({
				model : model,
				data : data,
				schemas : await this.getSchemaList(),
				action : "edit",
				req : req
			}),
			req,
			res
		)
	}

	async fields(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();

		const tableName = model.tableName;

		if (req.params.model) {
			return await this.render(
				'page-admin-field-editor',
				new ViewObject({
					schemas : await this.getSchemaList(),
					model : model,
					query : req.query,
					action : "fields",
					req : req
				}),
				req,
				res
			)
		} else {
			return await this.render(
				'page-admin-field-index',
				new ViewObject({
					schemas : await this.getSchemaList(),
					model : model,
					data : result,
					query : req.query,
					action : req.params.model,
					req : req
				}),
				req,
				res
			)
		}
	}

	async fieldsUpdate(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();

		const tableName = model.tableName;

		let fm = new FieldModel(req);
		let result = await fm.set(model.tableName, req.body);

		if (global.fieldCache[model.tableName]) {
			return res.success(global.fieldCache[model.tableName])
		}
		return res.success(global.fieldCache);
	}

	/**
	 * Query for 1 to n rows based on input query
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async query(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		await model.init();

		const tableName = model.tableName;

		return await res.render(
			'page-admin-search',
			new ViewObject({
				req : req,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				schemaList : await this.getSchemaList(),
				model : model,
				action : "query"
			})
		)
	}

	async search(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		let Model = await AdminController.getModel(req);

		if (!Controller) {
			return res.status(404).send("Unknown Controller");
		}

		let controller = new Controller();
		let model = new Model(req);
		model.debug = true;
		await model.init();

		const tableName = model.tableName;

		let fields = model.fields.adminIndex;

		req.query.properties = [];

		fields.forEach(
			function(item) {
				if (item.visible) {
					req.query.properties.push(item.property);
				}
			}
		);

		if (!req.query.properties.includes(model.primaryKey)) {
			req.query.properties.push(model.primaryKey);
		}

		return await controller.search(req, res);

	}

	/**
	 * Remove and existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		req.locals.isAdmin = true;
		let Controller = await AdminController.getController(req);
		return await res.render(
			'page-admin-delete',
			{
				req : req
			}
		)
	}

	async getSchemaList() {
		//TODO convert over to what's in memory
		if (!this.schemasLoaded) {
			let m = new SchemaModel();
			await m.init();
			await m.loadAll();
			this.schemasLoaded = true;
		}
		return global.schemaCache;
	}

	static async getModel(req) {
		let m = new SchemaModel();
		await m.init();
		/**
		 * @type {JSONSchema}
		 */
		let schema = await m.get(req.params.model);
		if (schema) {
			let m = getModel(schema.className + "Model");
			if (m) {
				return m;
			}
		}
		console.error("Could not find " + schema.className + "Model");

		return null;
	}

	static async getController(req) {
		let m = new SchemaModel();
		await m.init();
		/**
		 * @type {JSONSchema}
		 */
		console.log("Get Controller for " + req.params.model);
		let schema = await m.get(req.params.model);
		if (schema) {
			let c = getController(schema.className + "Controller");
			if (c) {
				return c;
			}
		}

		console.error("Could not find " + schema.className + "Controller");

		return null;
	}

}

module.exports = AdminController;
