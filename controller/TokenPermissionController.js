const ControllerBase = require('./ControllerBase');
const Model = require("../helper/get-model")("TokenPermissionModel");

class TokenPermissionController extends ControllerBase {
	/**
	 * @param {TokenPermissionModel} model
	 */
	constructor(model) {
		super(model || Model);
	}

	async adminCreate(req) {
		let data = await super.adminCreate(req);
		data.lookup.route = require("../helper/get-endpoints")();
		data.lookup.objectType = Object.keys(global.schemaCache);
		return data;
	}

	async adminUpdate(req) {
		let data = await super.adminUpdate(req);
		data.lookup.route = require("../helper/get-endpoints")();
		data.lookup.objectType = Object.keys(global.schemaCache);
		return data;
	}
}

module.exports = TokenPermissionController;
