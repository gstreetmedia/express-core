const ModelBase = require('./ModelBase');
const _ = require('lodash');
const cacheManager = require("../helper/cache-manager");

module.exports = class RolePermissionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_role_permissions'; }

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
