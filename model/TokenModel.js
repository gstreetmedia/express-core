const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../../schema/tokens-schema');
const fields = require('../../schema/fields/tokens-fields');
const uuid = require("node-uuid");

module.exports = class TokenModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return TokenModel.tableName;
	}

	static get tableName() {
		return "tokens";
	}

	static get schema() {
		if (global.schemaCache[TokenModel.tableName]) {
			return global.schemaCache[TokenModel.tableName]
		}
		return require('../../schema/tokens-schema');
	}

	static get fields() {
		if (global.fieldCache[TokenModel.tableName]) {
			return global.fieldCache[TokenModel.tableName];
		}
		return require('../../schema/fields/tokens-fields');
	}

	async index(query){
		return await super.index(query);
	}

	async create(data){
		data.key = uuid.v4();
		data.secret = uuid.v4();
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
		let Config = require("../../model/ConfigModel");

		return {
			config: {
				relation: "HasOne",
				modelClass: Config,
				join: {
					from: "configId",
					to: "id"
				}
			}
		}
	}

	get foreignKeys() {
		let Config = require("../../model/ConfigModel");

		return {
			configId : {
				modelClass : Config,
				to : "id"
			}
		}
	}

}