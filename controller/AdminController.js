const ViewControllerBase = require('./ViewControllerBase');
const ControllerBase = require("./ControllerBase");
const _ = require('lodash');
const fs = require('fs');
const inflector = require("../helper/inflector");
let helpers = require("../helper/view/index");
const FieldModel = require("../model/FieldModel");
const pagination = require("../helper/view/pagination");
let schemaList;

class AdminController extends ViewControllerBase {

	constructor() {
		super();
	}

	async home(req, res) {
		this.render(
			'page-admin-home',
			{
				schemaList : AdminController.getSchemaList(),
				slug : "home",
				action : "home",
				model : {
					schema : {
						title : "Home"
					}
				},
				_ : _,
				inflector : inflector
			},
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

		let controller = AdminController.getController(req);

		if (!controller) {
			return res.status(404).send("Unknown Controller");
		}

		let model = new controller.Model();
		const tableName = model.tableName;

		let rawfields;

		if (global.fieldCache && global.fieldCache[tableName]) {
			rawfields = global.fieldCache[tableName].adminIndex;
		} else {
			//console.log("or here");
			rawfields = controller.Model.fields.adminIndex;
		}

		req.query.select = req.query.select || [];
		let properties = controller.Model.schema.properties;

		rawfields.forEach(
			function(item) {
				if (item.property && item.visible && properties[item.property]) {
					if (_.isString(req.query.select)) {
						req.query.select = req.query.select.split(",");
					}
					if (req.query.select.indexOf(item.property) === -1) {
						req.query.select.push(item.property);
					}
				}
			}
		);

		if (controller.Model.schema.primaryKey && _.indexOf(req.query.select, controller.Model.schema.primaryKey) === -1) {
			//console.log("adding Primary");
			req.query.select.unshift(controller.Model.schema.primaryKey);
		}

		req.query.limit = req.query.limit || 50;

		if (!req.query.sort) {
			if (controller.Model.schema.properties.name) {
				req.query.sort = "name ASC";
			} else if (controller.Model.schema.properties.createdAt) {
				req.query.sort = "createdAt ASC";
			}
		}

		let data;
		if (controller.adminIndex) {
			data = await controller.adminIndex(req);
			if (!data) {
				return; //Assume Controller took care of everything
			}
		} else {
			data = await controller.query(req);
		}

		let slug = inflector.dasherize(inflector.singularize(req.params.model));

		return this.render(
			'page-admin-list',
			{
				title : req.params.model,
				name : inflector.singularize(inflector.titleize(inflector.dasherize(req.params.model))),
				slug : slug,
				model : model,
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "index",
				query : req.query,
				_ : _,
				inflector : inflector,
				pagination : pagination(req.query, data, slug, req)
			},
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
		let controller = AdminController.getController(req);

		let data;
		if (controller.adminCreate) {
			//If desired, create items in data for input field options (e.g select)
			data = await controller.adminCreate(req);
		}

		return this.render(
			'page-admin-edit',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				schemaList : AdminController.getSchemaList(),
				action : "create",
				data : data
			},
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
		let controller = AdminController.getController(req);
		req.query.join = {};
		req.query.joinFieldSet = "adminView";

		let m = new controller.Model();
		let relations = Object.keys(m.relations);
		relations.forEach(
			(key) => {
				if (m.relations[key].where) {
					req.query.join[key] = {where: m.relations[key].where}
				} else {
					req.query.join[key] = true;
				}
			}
		)

		let data;
		if (controller.adminView) {
			//If desired, create items in data for input field options (e.g select)
			data = await controller.adminView(req);
		} else {
			data = await controller.read(req);
		}

		if (!data) {
			return res.notFound(req.params.id);
		}

		return this.render(
			'page-admin-view',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(req),
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "view",
				_ : _
			},
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
		let controller = AdminController.getController(req);

		let data;
		if (controller.adminUpdate) {
			//If desired, create items in data for input field options (e.g select)
			data = await controller.adminUpdate(req);
		} else {
			data = await controller.read(req);
		}

		return this.render(
			'page-admin-edit',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "edit",
				_ : _
			},
			req,
			res
		)
	}

	async fields(req, res) {
		let controller = AdminController.getController(req);
		//let fm = new FieldModel(req);
		//let tableName = inflector.underscore(req.params.model);
		//let result = await fm.get(tableName, false);
		//console.log(result);
		let model = new controller.Model();
		if (req.params.model) {
			return this.render(
				'page-admin-field-editor',
				{
					schemaList : AdminController.getSchemaList(),
					title : "Fields",
					name : inflector.titleize(inflector.dasherize(req.params.model)),
					slug : inflector.dasherize(inflector.singularize(req.params.model)),
					model : model,
					fields : model.fields,
					query : req.query,
					_ : _,
					inflector : inflector,
					action : "fields"
				},
				req,
				res
			)
		} else {
			return this.render(
				'page-admin-field-index',
				{
					schemaList : AdminController.getSchemaList(),
					title : "Fields",
					name : "fields",
					slug : "fields",
					model : fm,
					data : result,
					query : req.query,
					_ : _,
					inflector : inflector,
					action : req.params.model
				},
				req,
				res
			)
		}
	}

	async fieldsUpdate(req, res) {
		let controller = AdminController.getController(req);
		let model = new controller.Model();

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
		let controller = AdminController.getController(req);

		return res.render(
			'page-admin-search',
			{
				req : req,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				schemaList : AdminController.getSchemaList(),
				model : new controller.Model(),
				action : "query"
			}
		)
	}

	async search(req, res) {
		let c = AdminController.getController(req);

		let fields;
		if (global.fieldCache && global.fieldCache[c.Model.tableName]) {
			fields = global.fieldCache[c.Model.tableName].adminIndex;
		} else {
			//console.log("or here");
			fields = c.Model.fields.adminIndex;
		}

		req.query.properties = [];
		console.log(fields);
		fields.forEach(
			function(item) {
				if (item.visible) {
					req.query.properties.push(item.property);
				}
			}
		);



		if (c) {
			return await c.search(req, res);
		} else {
			return res.status(404).send("Unknown Controller");
		}

	}

	/**
	 * Remove and existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		let controller = this.getController(req);
		return res.render(
			'page-admin-delete',
			{
				req : req
			}
		)
	}

	static getSchemaList() {
		if (schemaList) {
			return schemaList;
		}
		//TODO convert over to what's in memory

		let list = [];

		if (global.schemaCache) {
			for(let tableName in global.schemaCache) {
				list.push(
					{
						modelName : inflector.classify(tableName),
						name : inflector.humanize(tableName),
						slug : inflector.dasherize(tableName)
					}
				)
			}
			list = _.sortBy(list, ['modelName']);

			return list;
		}

		let files = fs.readdirSync(global.appRoot + '/src/schema');

		files.forEach(
			function(file) {
				if (file.indexOf(".js") === -1) {
					return;
				}
				file = file.split("-schema.js").join("");
				list.push(
					{
						modelName : inflector.classify(file),
						name : inflector.humanize(file),
						slug : inflector.singularize(file)
					}
				)
			}
		);
		schemaList = list;
		return schemaList;
	}

	static getModel(req) {
		const Model = require("../../model/" + inflector.classify(inflector.underscore(req.params.model)) + "Model");
		return Model
	}

	static getController(req) {
		let baseName = inflector.classify(inflector.underscore(req.params.model));
		let altName = inflector.singularize(baseName);

		let c = global.appRoot + "/src/controller/" + baseName + "Controller";

		if (fs.existsSync(c + ".js")) {
			const Controller = require(c);
			return new Controller();
		} else {

			c = global.appRoot + "/src/controller/" + altName + "Controller";
			if (fs.existsSync(c + ".js")) {
				const Controller = require(c);
				return new Controller();
			}
		}

		console.log("Could not find " + baseName + "Controller or " + altName + "Controller");

		return null;
	}

}

module.exports = AdminController;