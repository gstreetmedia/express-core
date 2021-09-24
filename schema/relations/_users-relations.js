exports.foreignKeys = {}
exports.relations = {
	userPermissions : {
		relation: "HasMany",
		model: "UserPermissionModel",
		join: {
			from: "id",
			to: "userId"
		}
	},
	roles : {
		relation: "HasMany",
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
