exports.relations = {
	"fields" : {
		type : "HasOne",
		model : "FieldModel",
		join : {
			from : "tableName",
			to : "tableName"
		}
	}
}
exports.foreignKeys = {

}
