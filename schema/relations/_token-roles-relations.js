exports.relations = {}
exports.foreignKeys = {
	roleId : {
		modelClass : "RoleModel",
		to : "id",
	},
	tokenId : {
		modelClass : "TokenModel",
		to : "id"
	}
}
