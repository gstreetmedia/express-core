const ControllerBase = require('./ControllerBase');
const Model = require("../model/ConfigModel");

class ConfigController extends ControllerBase {
	/**
	 * @param {ConfigModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = ConfigController;
