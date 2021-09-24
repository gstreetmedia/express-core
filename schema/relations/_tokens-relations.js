exports.relations = {
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
	tokenPermissions: {
		relation: "HasMany",
		modelClass: "TokenPermissionModel",
		join: {
			from: "id",
			to: "tokenId"
		}
	}
}
exports.foreignKeys = {
	roleId : {
		modelClass : "RoleModel",
		to : "id",
	},
	tokenId : {
		modelClass : "TokenModel",
		to : "id"
	},
	configId : {
		modelClass : "ConfigModel",
		to : "id"
	}
}
