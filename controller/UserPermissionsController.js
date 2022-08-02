const ControllerBase = require('./ControllerBase');
const Model = require("../helper/get-model")("UserPermissionModel");

class UserPermissionsController extends ControllerBase {
	/**
	 * @param {UserPermissionModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = UserPermissionsController;