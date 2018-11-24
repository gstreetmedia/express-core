const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../../schema/users-schema');
const validation = require('../../schema/validation/users-validation');
const fields = require('../../schema/fields/users-fields');

const hashPassword = require("../helper/hash-password");

module.exports = class UserModel extends ModelBase {

	constructor(req) {
		super(schema, validation, fields, req);
	}

	static get schema() { return schema; }

	static get validation() { return validation; }

	static get fields() { return fields; }

	async index(query){
		return await super.index(query);
	}

	async create(data){
		data.password = hashPassword(data.password);
		if (!data.name) {
			data.name = data.firstName + " " + data.lastName;
		}
		return await super.create(data);
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, query){
		if (data.password) {
			data.password = hashPassword(data.password);
		}
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