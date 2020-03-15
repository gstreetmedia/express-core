const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require("../../model/SchemaModel");
const validator = require("validator");

class SchemaController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			Model = require('../model/SchemaModel');
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

	async update(req, res){
		return await super.update(req, res);
	}

	async query(req, res){
		return await super.query(req, res);
	}

	async destroy(req, res){
		return await super.destroy(req, res);
	}

}

module.exports = SchemaController;