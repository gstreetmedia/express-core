const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const schema = require('../schema/token-permissions-schema');
const fields = require('../schema/fields/token-permissions-fields');

module.exports = class TokenPermissionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return TokenPermissionModel.tableName; }

	static get tableName() { return 'token_permissions'; }

	static get schema() { return ModelBase.getSchema(TokenPermissionModel.tableName); }

	static get fields() { return ModelBase.getFields(TokenPermissionModel.tableName); }

	async create(data){
		return await super.create(data);
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, fetch){
		return await super.update(id, data, fetch);
	}

	async query(query){
		return await super.query(query);
	}

	async destroy(id){
		return await super.destroy(id);
	}

	get foreignKeys () {
		return {
			tokenId : {
				modelClass : "TokenModel",
				to : "id"
			}
		}
	}

}
