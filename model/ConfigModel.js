const ModelBase = require('./ModelBase');
const _ = require('lodash');

class ConfigModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return "_config";
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

	get relations() {
		return {

		}
	}

}

module.exports = ConfigModel;
