let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.schemaCache[tableName]) {
		return global.schemaCache[tableName]
	}

	return require('../schema/' + inflector.dasherize(tableName) + '-schema');
}