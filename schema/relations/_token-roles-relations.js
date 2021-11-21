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
	roleId : {
		modelClass : "RoleModel",
		to : "id",
	},
	tokenId : {
		modelClass : "TokenModel",
		to : "id"
	}
}
