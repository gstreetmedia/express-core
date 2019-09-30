let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.fieldCache[tableName]) {
		return global.fieldCache[tableName];
	}
	global.fieldCache[tableName] = require(global.appRoot + '/src/schema/fields/' + inflector.dasherize(tableName.toLowerCase()) + '-schema');
	return global.fieldCache[tableName];
}