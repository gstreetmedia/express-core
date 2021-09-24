const ControllerBase = require('./ControllerBase');
const Model = require('../model/TokenModel');

class TokenController extends ControllerBase {
	/**
	 * @param {TokenModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = TokenController;
