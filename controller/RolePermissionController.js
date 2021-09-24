const ControllerBase = require('./ControllerBase');
const Model = require('../model/RolePermissionModel');

module.exports = class RolePermissionController extends ControllerBase {
	/**
	 * @param {RolePermissionModel} model
	 */
	constructor(model) {
		super(model || Model);
	}

	async adminCreate(req) {
		let data = await super.adminCreate(req);
		data.lookup.route = require("../helper/view/endpoints-lookup")();
		data.lookup.objectType = Object.keys(global.schemaCache);
		return data;
	}

	async adminUpdate(req) {
		let data = await super.adminUpdate(req);
		data.lookup.route = require("../helper/view/endpoints-lookup")();
		data.lookup.objectType = Object.keys(global.schemaCache);
		return data;
	}
}
