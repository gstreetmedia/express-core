exports.relations = {
	"schema" : {
		type : "HasOne",
		model : "SchemaModel",
		join : {
			from : "tableName",
			to : "tableName"
		}
	}
}
exports.foreignKeys = {

}
