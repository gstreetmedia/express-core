let inflector = require("./inflector");

module.exports = (tableName) => {
	if (global.schemaCache && global.schemaCache[tableName]) {
		return global.schemaCache[tableName];
	}
	//Ideally, we'd pull from the db, but since that's going to be async we'll pull a local version
	return require(global.appRoot + '/src/schema/' + inflector.dasherize(tableName.toLowerCase()) + '-schema');
}
