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
	if (fileName.indexOf("-") === 0) {
		fileName = "_" + fileName.substring(1, fileName.length);
	}
	try {
		let obj = require(global.appRoot + '/src/schema/relations/' + fileName + '-relations');
		if (obj.foreignKeys) {
			global.foreignKeyCache[tableName] = obj.foreignKeys;
			return obj.foreignKeys;
		}
		if (obj.relations) {
			global.relationCache[tableName] = obj.relations;

		}
		if (obj.foreignKeys) {
			global.foreignKeyCache[tableName] = obj.foreignKeys;
			return obj.foreignKeys;
		}
		global.foreignKeyCache[tableName] = {};
		return global.foreignKeyCache[tableName];
	} catch (e) {
		return {};
	}
}
