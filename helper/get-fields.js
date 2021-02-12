let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.fieldCache && global.fieldCache[tableName]) {
		return global.fieldCache[tableName];
	}
	//Ideally, we'd pull from the db, but since that's going to be async we'll pull a local version
	return require(global.appRoot + '/src/schema/fields/' + inflector.dasherize(tableName.toLowerCase()) + '-fields')
}
