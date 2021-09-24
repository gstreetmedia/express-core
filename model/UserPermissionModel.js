const ModelBase = require('./ModelBase');

class RolePermissionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_user_role_permissions'; }

	async afterCreate(id, data) {
		if (data.userId) {
			await cache.del('authenticated_user_' + data.userId);
		}
	}

	async afterUpdate(id, data) {
		if (data.userId) {
			await cache.del('authenticated_user_' + data.userId);
		}
	}
}

module.exports = RolePermissionModel;
