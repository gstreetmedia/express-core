const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const fs = require("fs");

class TokenController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			if (fs.existsSync(__dirname + "/../../model/TokenModel.js")) {
				Model = require("../../model/TokenModel");
			} else {
				Model = require('../model/TokenModel');
			}
		}
		super(Model);
	}

}

module.exports = TokenController;
