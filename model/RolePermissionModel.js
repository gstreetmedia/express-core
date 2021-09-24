const ModelBase = require('./ModelBase');
const _ = require('lodash');
const cacheManager = require("../helper/cache-manager");

module.exports = class RolePermissionModel extends ModelBase {

	get tableName() { return '_role_permissions'; }

	get foreignKeys () {
		return {
			roleId : {
				modelClass : "RoleModel",
				to : "id"
			}
		}
	}

	/**
	 * Clear the cache for this role
	 * @param id
	 * @param record
	 * @returns {Promise<void>}
	 */
	async afterUpdate(id, record) {
		let RoleModel = require("./RoleModel");
		let m = new RoleModel();
		let role = await m.read(record.roleId);
		await cacheManager.del("role_" + role.id);
		await cacheManager.del("role_" + role.name);
		return record;
	}

}
