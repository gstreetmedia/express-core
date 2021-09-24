exports.relations = {
	rolePermissions : {
		type: "HasMany",
		model: "RolePermissionModel",
		join: {
			from: "id",
			to: "roleId"
		}
	}
}
exports.foreignKeys = {

}
