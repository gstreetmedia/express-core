let inflector = require("./inflector");

module.exports = (tableName) => {
	return require(global.appRoot + '/src/schema/fields/' + inflector.dasherize(tableName.toLowerCase()) + '-fields')
}