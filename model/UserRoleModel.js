const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const schema = require('../schema/user-roles-schema');
const fields = require('../schema/fields/user-roles-fields');


class UserRoleModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return UserRoleModel.tableName; }

	static get tableName() { return 'user_roles'; }

	static get schema() { return ModelBase.getSchema(UserRoleModel.tableName); }

	static get fields() { return ModelBase.getFields(UserRoleModel.tableName); }

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

module.exports = UserRoleModel;
