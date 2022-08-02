const ControllerBase = require('./ControllerBase');
const Model = require("../helper/get-model")("RoleModel");

class RoleController extends ControllerBase {
	/**
	 * @param {RoleModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = RoleController;