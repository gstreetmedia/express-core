const inflector = require("inflected");
const _ = require("lodash");
const moment = require("moment-timezone");
const fs = require("fs");
const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

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
	 * @param {ViewObject} obj
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise<void>}
	 */
	async render(viewName, o, req, res) {
		let view = await getView(viewName);
		if (!o.req) {
			o.req = req;
		}
		if (o.req.xhr) {
			return res.success(
				{
					data : {message:"Hi!"},
					html : await renderView(view, o),
				}
			);
		}
		return res.send(await renderView(view, o));
	}


}

module.exports = ViewControllerBase;
