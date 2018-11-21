const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require('../model/TokenModel');

module.exports = class TokenController extends ControllerBase {

	constructor() {
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