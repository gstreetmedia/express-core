const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../schema/users-schema');
const validation = require('../schema/validation/users-validation');
const fields = require('../schema/fields/users-fields');

module.exports = class UserModel extends ModelBase {

	constructor(req) {
		super(schema, validation, fields, req);
	}

	static get schema() { return schema; }

	static get validation() { return validation; }

	static get fields() { return fields; }

	async index(key, value){
		return await super.index(key, value);
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

	async login(username, password) {

	}

}