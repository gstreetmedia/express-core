exports.types = {
	config: {
		type: "HasOne",
		model: "ConfigModel",
		join: {
			from: "configId",
			to: "id"
		}
	},
	roles: {
		type: "HasMany",
		model: "RoleModel",
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
	tokenRoles : {
		type: "HasMany",
		model: "TokenRoleModel",
		join: {
			from: "id",
			to: "tokenId"
		},
		debug : true
	},
	tokenPermissions: {
		type: "HasMany",
		model: "TokenPermissionModel",
		join: {
			from: "id",
			to: "tokenId"
		}
	}
}
exports.foreignKeys = {
	roleId : {
		model : "RoleModel",
		to : "id",
	},
	configId : {
		model : "ConfigModel",
		to : "id"
	}
}
