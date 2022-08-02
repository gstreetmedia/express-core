const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require("../helper/get-model")("HistoryModel");

class HistoryController extends ControllerBase {
	constructor(model) {
		super(model || Model);
	}
}
module.exports = HistoryController;