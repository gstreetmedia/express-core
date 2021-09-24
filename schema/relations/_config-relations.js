exports.relations = {
	"tokens" : {
		type : "HasMany",
		model : "TokenModel",
		join : {
			from : "id",
			to : "configId"
		}
	}
}
exports.foreignKeys = {

}
