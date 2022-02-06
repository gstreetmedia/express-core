exports.relations = {
	permissions: {
		type: "HasMany",
		modelClass: "RolePermissionModel",
		join: {
			from: "roleId",
			to: "id"
		}
	}
}
exports.foreignKeys = {

}
