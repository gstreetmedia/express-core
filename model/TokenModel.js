const ModelBase = require('./ModelBase');
const _ = require('lodash');
const uuid = require("node-uuid");
const hashPassword = require("../helper/hash-password");
const cache = require('../helper/cache-manager');

module.exports = class TokenModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_tokens'; }

	async create(data){
		data.key = uuid.v4();
		let secret = data.secret = uuid.v4();
		if (process.env.CORE_TOKENS_HASH_SECRET === "true") {
			data.secret = hashPassword(secret);
		}
		let result = await super.create(data);
		if (!result.error) {
			result.secret = data.secret;
		}
		return result;
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, fetch){
		let secret = data.secret;
		if (process.env.CORE_TOKENS_HASH_SECRET === "true" && data.secret) {
			data.secret = hashPassword(data.secret);
		}
		let result = await super.update(id, data, true);
		if (!result.error && secret) {
			result.secret = secret;
		}
		return result;
	}

	async query(query){
		return await super.query(query);
	}

	async destroy(id) {

		const TP = require("./TokenPermissionModel");
		let tp = new TP(this.req);
		await tp.destroyWhere(
			{
				where : {
					tokenId : id
				}
			}
		)

		const TR = require("./TokenRoleModel");
		let tr = new TR(this.req);
		await tr.destroyWhere(
			{
				where : {
					tokenId : id
				}
			}
		);

		return super.destroy(id);
	}

	get relations() {
		return {
			config: {
				relation: "HasOne",
				modelClass: "ConfigModel",
				join: {
					from: "configId",
					to: "id"
				}
			},
			roles: {
				relation: "HasMany",
				modelClass: "RoleModel",
				throughClass: "TokenRoleModel",
				join: {
					from: "id",
					through: {
						from: "tokenId",
						to: "roleId"
					},
					to: "id"
				}
			},
			permissions: {
				relation: "HasMany",
				modelClass: "TokenPermissionModel",
				join: {
					from: "id",
					to: "tokenId"
				}
			}
		}
	}

	get foreignKeys() {
		return {
			configId : {
				modelClass : "ConfigModel",
				to : "id"
			}
		}
	}
}

/*


			datasets: {
				relation: "HasOne",
				throughClass : "ConfigModel",
				modelClass: "DatasetModel",
				join: {
					from: "configId",
					through : {
						from : "id",
						to : "datasetId"
					},
					to: "id"
				},
				debug : true
			},
 */
