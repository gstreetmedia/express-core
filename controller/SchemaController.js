const ControllerBase = require('./ControllerBase');
const Model = require('../model/SchemaModel');

class SchemaController extends ControllerBase {
	/**
	 * @param {SchemaModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = SchemaController;
