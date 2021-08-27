const ModelBase = require('./ModelBase');
const _ = require('lodash');
const cacheManager = require("../helper/cache-manager");

module.exports = class RoleModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_roles'; }

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

	/**
	 * Pass in the id of a role and we'll get back something.
	 * @param id
	 * @returns {Promise<null|*>}
	 */
	async getRoleById(id) {
		if (!id) {
			return null;
		}
		let key = "role_" + id;
		let role = await this.cache.get(key);

		if (role) {
			return role;
		}

		let query = {
			join : {
				permissions : true,
				select : ['id','objectType','objectId','relatedObjectType','relatedObjectId','c','r','u','d','cFields','rFields','uFields']
			}
		};

		role = await this.read(id, query);

		if (!role.error) {
			await cacheManager.set(key, role)
		}

		return role;
	}

	/**
	 * Get a role by it's name e.g "agent" "super-api"
	 * @param roleName
	 * @returns {Promise<*>}
	 */
	async getRoleByName(roleName) {

		//console.log("getRolesByName " + roleName);

		if (!roleName) {
			throw new Error("Missing Role Name");
		}

		let key = "role_" + roleName;
		let role = await cache.get(key);

		if (role) {
			return role;
		}

		let query = {
			where : {
				name : roleName,
				status : "active"
			},
			join : {
				permissions : true
			}
		};

		role = await this.findOne(query, true);

		if (role && !role.error) {
			await cacheManager.set(key, role)
		} else {
			console.log("Could not find role " + roleName);
			//console.log(roleName);
		}

		return role;
	}

	get relations() {
		return {
			permissions : {
				relation: "HasMany",
				modelClass: "RolePermissionModel",
				join: {
					from: "id",
					to: "roleId"
				}
			}
		}
	}

}
