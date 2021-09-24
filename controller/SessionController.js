const ControllerBase = require('./ControllerBase');
const Model = require('../model/SessionModel');

class SessionController extends ControllerBase {
	/**
	 * @param {SessionModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = SessionController;
