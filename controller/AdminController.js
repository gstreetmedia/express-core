const ViewControllerBase = require('./ViewControllerBase');
const ControllerBase = require("./ControllerBase");
const _ = require('lodash');
const fs = require('fs');
const inflector = require("inflected");
let helpers = require("../helper/view/index");
let FieldModel = require("../model/FieldModel");
let schemaList;

module.exports = class AdminController extends ViewControllerBase {

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
		)
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
			throw new Error("Unknown controller");
		}

		const tableName = controller.Model.schema.tableName;

		if (global.fieldCache && global.fieldCache[tableName]) {
			req.query.select = [];

			let rawfields = global.fieldCache[tableName].adminIndex;
			let fields = [];
			for (let k in rawfields) {
				if (rawfields[k]) {
					req.query.select.push(k);
				}
			}
			console.log("from cache");
		} else {
			req.query.select = controller.Model.fields.admin.index;
		}

		if (_.indexOf(req.query.select, controller.Model.schema.primaryKey) === -1) {
			req.query.select.unshift(controller.Model.schema.primaryKey);
		}

		req.query.limit = req.query.limit || 50;
		req.query.sort = req.query.sort ? req.query.sort : req.order || "name ASC";
		let data = await controller.query(req);

		return this.render(
			'page-admin-list',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "index",
				query : req.query,
				_ : _,
				inflector : inflector
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

		return this.render(
			'page-admin-edit',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				schemaList : AdminController.getSchemaList(),
				action : "create"
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
		req.query.join = "*";
		let data = await controller.read(req);

		if (!data) {
			return res.notFound(req.params.id);
		}

		//console.log(data);

		return this.render(
			'page-admin-view',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "view"
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
		let data = await controller.read(req);

		return this.render(
			'page-admin-edit',
			{
				title : req.params.model,
				name : inflector.titleize(inflector.dasherize(req.params.model)),
				slug : inflector.dasherize(inflector.singularize(req.params.model)),
				model : new controller.Model(),
				data : data,
				schemaList : AdminController.getSchemaList(),
				action : "edit"
			},
			req,
			res
		)
	}

	async fields(req, res) {
		let fm = new FieldModel(req);
		let result = await fm.get(req.params.model, false);
		if (req.params.model) {
			return res.render(
				'page-admin-field-editor',
				{
					schemaList : AdminController.getSchemaList(),
					title : "Fields",
					name : inflector.titleize(inflector.dasherize(req.params.model)),
					slug : inflector.dasherize(inflector.singularize(req.params.model)),
					model : fm,
					fields : result,
					data : result,
					query : req.query,
					_ : _,
					inflector : inflector,
					action : req.params.model
				}
			)
		} else {
			return res.render(
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
				}
			)
		}

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
		let Controller = require("./" + req.params.controller + "Controller");
		let c = new Controller();
		return await c.search(req, res);
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
						slug : inflector.singularize(tableName)
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
		let c = "../../controller/" + inflector.classify(inflector.underscore(req.params.model)) + "Controller";
		//console.log(c);
		const Controller = require(c);
		return new Controller();
	}

}