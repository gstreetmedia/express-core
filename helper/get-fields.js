let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.fieldCache && global.fieldCache[tableName]) {
		return global.fieldCache[tableName];
	}
	return require(global.appRoot + '/src/schema/fields/' + inflector.dasherize(tableName.toLowerCase()) + '-fields')
}