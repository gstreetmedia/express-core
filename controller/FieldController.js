const ControllerBase = require('./ControllerBase');
const Model = require("../model/FieldModel");

class FieldController extends ControllerBase {
	/**
	 * @param {FieldModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}

module.exports = FieldController;
