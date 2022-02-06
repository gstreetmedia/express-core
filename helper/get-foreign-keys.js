let inflector = require("./inflector");
let fs = require("fs");
let path = require("path");
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
		global.appRoot + '/src/schema/relations/' + fileName + '-relations',
		global.appRoot + '/src/core/schema/relations/' + fileName + '-relations',
	]

	while(paths.length > 0) {
		try {
			let relations = require(paths[0]);
			global.foreignKeyCache[tableName] = relations.foreignKeys;
			return global.foreignKeyCache[tableName];
		} catch (e) {
			//console.log(e.message);
			//console.log("no relations @ " + paths[0]);
		}
		paths.shift();
	}
	global.foreignKeyCache[tableName] = global.foreignKeyCache[tableName] || {};
}
