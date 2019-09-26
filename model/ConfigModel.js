const ModelBase = require('./ModelBase');
const _ = require('lodash');

module.exports = class ConfigModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return ConfigModel.tableName;
	}

	static get tableName() {
		return "config";
	}

	static get schema() { return ModelBase.getSchema(ConfigModel.tableName); }

	static get fields() { return ModelBase.getFields(ConfigModel.tableName); }

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
		return {
			config: {
				relation: "HasMany",
				modelClass: "TokenModel",
				join: {
					from: "id",
					to: "configId"
				}
			}
		}
	}

}