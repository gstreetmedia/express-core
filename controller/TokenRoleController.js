const ControllerBase = require('./ControllerBase');
const Model = require("../helper/get-model")("TokenRoleModel");

class TokenRoleController extends ControllerBase {
	/**
	 * @param {TokenRoleModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = TokenRoleController;