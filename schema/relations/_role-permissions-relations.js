exports.relations = {
	role : {
		type : "HasOne",
		model : "RoleModel",
		join : {
			from : "roleId",
			to : "id"
		}
	}
}
exports.foreignKeys = {

}
