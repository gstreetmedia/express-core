exports.relations = {
	"fields" : {
		type : "HasMany",
		model : "UserModel",
		join : {
			from : "userId",
			to : "id"
		}
	}
}
exports.foreignKeys = {

}
