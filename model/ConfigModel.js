const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../../schema/config-schema');
const validation = require('../../schema/validation/config-validation');
const fields = require('../../schema/fields/config-fields');

module.exports = class ConfigModel extends ModelBase {

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
		let Token = require("../../model/TokenModel");

		return {
			config: {
				relation: "HasMany",
				modelClass: Token,
				join: {
					from: "id",
					to: "configId"
				}
			}
		}
	}

}