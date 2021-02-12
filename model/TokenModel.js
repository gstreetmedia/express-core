let ModelBase = require('../core/model/TokenModel');

module.exports = class TokenModel extends ModelBase {


	async destroy(id) {

		let M = require("./TokenPermissionModel");
		m = new M();
		await m.destroyWhere(
			{
				where : {
					tokenId : id
				}
			}
		)
		await super.destroy(id);

		M = require("./TokenRoleModel");
		let m = new M();
		await m.destroyWhere(
			{
				where : {
					tokenId : id
				}
			}
		);

		return this.destroy(id);
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
