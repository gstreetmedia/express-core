let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.schemaCache && global.schemaCache[tableName]) {
		return global.schemaCache[tableName];
	}
	return require(global.appRoot + '/src/schema/' + inflector.dasherize(tableName.toLowerCase()) + '-schema');
}