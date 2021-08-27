const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const fs = require("fs");

class FieldController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			if (fs.existsSync("../../model/FieldModel.js")) {
				Model = require("../../model/FieldModel");
			} else {
				Model = require('../model/FieldModel');
			}
		}
		super(Model);
	}
}

module.exports = FieldController;
