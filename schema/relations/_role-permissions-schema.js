exports.relations = {
	"fields" : {
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
