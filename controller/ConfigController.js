const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const fs = require("fs");

class ConfigController extends ControllerBase {

	constructor(model) {
		if(!model) {
			if (fs.existsSync(__dirname + "/../../model/ConfigModel.js")) {
				model = require("../../model/ConfigModel");
			} else {
				model = require('../model/ConfigModel');
			}
		}
		super(model);
	}

}

module.exports = ConfigController;
