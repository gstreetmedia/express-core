const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const schema = require('../schema/token-roles-schema');
const fields = require('../schema/fields/token-roles-fields');


module.exports = class TokenRoleModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return TokenRoleModel.tableName; }

	static get tableName() { return 'token_roles'; }

	static get schema() { return ModelBase.getSchema(TokenRoleModel.tableName); }

	static get fields() { return ModelBase.getFields(TokenRoleModel.tableName); }

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

	get relations() {
		return {}

	}

	get foreignKeys () {
		return {
			roleId : {
				modelClass : "RoleModel",
				to : "id",
			},
			tokenId : {
				modelClass : "TokenModel",
				to : "id"
			}
		}
	}

}
