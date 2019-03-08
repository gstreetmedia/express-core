let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.schemaCache[tableName]) {
		return global.schemaCache[tableName].properties;
	}

	return require('../schema/fields/' + inflector.dasherize(tableName) + '-schema');
}