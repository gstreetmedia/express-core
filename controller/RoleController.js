const ControllerBase = require('./ControllerBase');
const Model = require('../model/RoleModel');

module.exports = class RoleController extends ControllerBase {
	/**
	 * @param {RoleModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}
