let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.schemaCache[tableName]) {
		return global.schemaCache[tableName];
	}
	console.log("WTF loading schema " + tableName);
	global.schemaCache[tableName] = require(global.appRoot + '/src/schema/' + inflector.dasherize(tableName.toLowerCase()) + '-schema');
	return global.schemaCache[tableName];
}