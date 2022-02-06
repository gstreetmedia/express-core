let inflector = require("./inflector");
let path = require("path");
let fs = require("fs");
global.relationCache = global.relationCache || {};
global.foreignKeyCache = global.foreignKeyCache || {};

module.exports = async(tableName, model) => {
	if (global.relationCache[tableName]) {
		return global.relationCache[tableName];
	}
	if (model && model.relations) {
		return model.relations;
	}

	let fileName = inflector.dasherize(tableName.toLowerCase());

	let paths = [
		global.appRoot + '/src/schema/relations/' + fileName + '-relations',
		global.appRoot + '/src/core/schema/relations/' + fileName + '-relations',
	]

	while(paths.length > 0) {
		try {
			let relations = require(paths[0]);
			global.relationCache[tableName] = relations.relations;
			global.foreignKeyCache[tableName] = relations.foreignKeys;
			return global.relationCache[tableName];
		} catch (e) {
		}
		paths.shift();
	}
	global.relationCache[tableName] = global.relationCache[tableName] || {};

}
