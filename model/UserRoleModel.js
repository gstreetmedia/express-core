const ModelBase = require('./ModelBase');
const _ = require('lodash');


class UserRoleModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_user_roles'; }

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
		return {
			permissions: {
				relation: "HasMany",
				modelClass: "RolePermissionModel",
				join: {
					from: "roleId",
					to: "id"
				}
			}
		}
	}

	get foreignKeys () {
		return {
			roleId : {
				modelClass : "RoleModel",
				to : "id",
			},
			userId : {
				modelClass : "UserModel",
				to : "id"
			}
		}
	}

}

module.exports = UserRoleModel;
