const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const fs = require("fs");

class SessionController extends ControllerBase {

	constructor(model) {
		if(!model) {
			if (fs.existsSync(__dirname + "/../../model/SessionModel.js")) {
				model = require("../../model/SessionModel");
			} else {
				model = require('../model/SessionModel');
			}
		}
		super(model);
	}

}

module.exports = SessionController;
