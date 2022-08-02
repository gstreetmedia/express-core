const ControllerBase = require('./ControllerBase');
const Model = require("../helper/get-model")("UserRoleModel");

class UserRoleController extends ControllerBase {
	/**
	 * @param {UserRoleModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = UserRoleController;