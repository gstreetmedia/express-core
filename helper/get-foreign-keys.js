let inflector = require("./inflector");
let fs = require("fs");
let path = require("path");

module.exports = async(tableName, model) => {
	if (global.foreignKeyCache && global.foreignKeyCache[tableName]) {
		return global.foreignKeyCache[tableName];
	}
	if (model.foreignKeys) {
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
		global.foreignKeyCache[tableName] = {};
		return global.foreignKeyCache[tableName];
	} catch (e) {
		return {};
	}
}
