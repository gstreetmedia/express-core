const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require("../helper/get-model")("LogModel");

class LogController extends ControllerBase {

	/**
	 * @param {LogModel} model
	 */
	constructor(model) {
		super(model || Model);
	}
}
module.exports = LogController;