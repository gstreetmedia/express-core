const ControllerBase = require('./ControllerBase');
const _ = require('lodash');


module.exports = class FieldController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			Model = require('../model/FieldModel');
		}
		super(Model);
	}

	async index(req, res){
		return await super.index(req, res);
	}

	async create(req, res){
		return await super.create(req, res);
	}

	async read(req, res){
		return await super.read(req, res);
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