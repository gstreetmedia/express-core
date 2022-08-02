const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require("../helper/get-model")("FieldModel");

class FieldController extends ControllerBase {
	constructor() {
		super(Model);
	}
}
module.exports = FieldController