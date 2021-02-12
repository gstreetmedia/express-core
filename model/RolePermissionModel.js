const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const cache = require("../core/helper/cache-manager");

module.exports = class RolePermissionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return RolePermissionModel.tableName; }

	static get tableName() { return 'role_permissions'; }

	static get schema() { return ModelBase.getSchema(RolePermissionModel.tableName); }

	static get fields() { return ModelBase.getFields(RolePermissionModel.tableName); }

	async index(query){
		return await super.index(query);
	}

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
		await cache.del("role_" + role.id);
		await cache.del("role_" + role.name);
		return record;
	}

}