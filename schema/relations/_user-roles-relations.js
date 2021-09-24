exports.relations = {
	permissions: {
		relation: "HasMany",
		modelClass: "RolePermissionModel",
		join: {
			from: "roleId",
			to: "id"
		}
	}
}
exports.foreignKeys = {

}
