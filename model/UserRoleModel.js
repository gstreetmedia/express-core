const ModelBase = require('./ModelBase');
const _ = require('lodash');
const cache = require("../helper/cache-manager");

class UserRoleModel extends ModelBase {

	get tableName() { return '_user_roles'; }

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

module.exports = UserRoleModel;
