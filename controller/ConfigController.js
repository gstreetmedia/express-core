const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require("../helper/get-model")("ConfigModel");

class ConfigController extends ControllerBase {
	constructor() {
		super(Model);
	}
}
module.exports = ConfigController