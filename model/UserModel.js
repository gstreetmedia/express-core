const ModelBase = require('../core/ModelBase');
const _ = require('lodash');
const schema = require('../schema/config-schema');

module.exports = class ConfigModel extends ModelBase {

	constructor(req) {
		super(schema,'id',req);
	}

	async index(query){
		return await super.index(query);
	}

	async create(data){
		return await super.create(data);
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, query){
		return await super.update(id, data, query);
	}

	async query(query){
		return await super.query(query);
	}

	async destroy(id){
		return await super.destroy(id);
	}

}