var inflector = require("inflected");
var _ = require("lodash");
var moment = require("moment-timezone");
var helpers = require("../view/index");

module.exports = class ViewControllerBase {
	constructor() {

	}

	/**
	 * Get a list of a model, typically of id's
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async index(req, res) {
		console.log("ControllerBase::index");
		return this.render(
			'page-list',
			{
				req : req
			}
		)
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

	render(page, obj, req, res) {
		let o = {
			helpers : helpers,
			req : req
		}
		_.extend(o, obj);
		res.render(page, o);
	}


}