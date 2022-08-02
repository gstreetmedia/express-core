const inflector = require("inflected");
const _ = require("lodash");
const moment = require("moment-timezone");
const fs = require("fs");
const getView = require("../helper/get-view");
const renderView = require("../helper/render-view");

class ViewControllerBase {
	constructor() {

	}

	/**
	 * Create a new row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async create(req, res) {
		return this.render(
			'page-create',
			{
				req : req
			}
		)
	}

	/**
	 * Read an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async view(req, res) {
		return this.render(
			'page-view',
			{
				req : req
			}
		)
	}

	/**
	 * Update / Replace an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async update(req, res) {
		return this.render(
			'page-edit',
			{
				req : req
			}
		)
	}


	/**
	 * Query for 1 to n rows based on input query
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async query(req, res) {
		return this.render(
			'page-search',
			{
				req : req
			}
		)
	}

	/**
	 * Remove and existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		return this.render(
			'page-delete',
			{
				req : req
			}
		)
	}

	/**
	 *
	 * @param {string|array} viewName
	 * @param {ViewObject} o
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<void>}
	 */
	async render(viewName, o, req, res) {
		let view = await getView(viewName);
		if (!o.req) {
			o.req = req;
		}
		let html = await renderView(view, o);
		if (o.req.xhr) {
			Object.keys(o.data).forEach(
				(key) => {
					JSON.stringify(o.data[key]);
				}
			)
			return res.success(
				{
					data : o.data,
					html : html,
					model : o.model.schema.object,
					metric : req.locals.metrics
				}
			);
		}
		return res.html(html);
	}


}

module.exports = ViewControllerBase;
