exports.foreignKeys = {}
exports.relations = {
	userPermissions : {
		type: "HasMany",
		model: "UserPermissionModel",
		join: {
			from: "id",
			to: "userId"
		}
	},
	roles : {
		type: "HasMany",
		model: "RoleModel",
		throughModel: "UserRoleModel",
		join: {
			from: "id",
			through : {
				from : "userId",
				to : "roleId"
			},
			to: "id"
		}
	}
}
