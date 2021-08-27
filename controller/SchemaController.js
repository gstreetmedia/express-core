const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const validator = require("validator");
const fs = require("fs");

class SchemaController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			if (fs.existsSync(__dirname + "/../../model/SchemaModel.js")) {
				Model = require("../../model/SchemaModel");
			} else {
				Model = require('../model/SchemaModel');
			}
		}
		super(Model);
	}

	async create(req, res){
		return await super.create(req, res);
	}

	async read(req, res){
		let results;
		if (validator.isUUID) {
			results = await super.read(req, res);
		} else {
			let m = new Model();
			results = await m.findOne(
				{
					where : {
						tableName : req.params.id
					}
				}
			)
		}
	}


}

module.exports = SchemaController;
