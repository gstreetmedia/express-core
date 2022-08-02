let inflector = require("./inflector");
const checkRequire = require("./check-require");
global.foreignKeyCache = global.foreignKeyCache || {};

module.exports = async(tableName, model) => {
	if (global.foreignKeyCache[tableName]) {
		return global.foreignKeyCache[tableName];
	}

	if (model && model.foreignKeys) {
		return model.foreignKeys;
	}

	let fileName = inflector.dasherize(tableName.toLowerCase());
	let paths = [
		global.appRoot + '/src/schema/relations/' + fileName + '-relations.js',
		__dirname + '/../schema/relations/' + fileName + '-relations.js',
	]

	while(paths.length > 0) {
		let o = checkRequire(paths[0]);
		if (o) {
			global.foreignKeyCache[tableName] = o.foreignKeys;
			return global.foreignKeyCache[tableName];
		}
		paths.shift();
	}
	global.foreignKeyCache[tableName] = global.foreignKeyCache[tableName] || {};
}
