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
	if (fileName.indexOf("-") === 0) {
		fileName = "_" + fileName.substring(1, fileName.length);
	}

	try {
		let p = path.resolve(global.appRoot + '/src/schema/relations/' + fileName + '-relations.js');
		if (fs.existsSync(p)) {
			let obj = require(global.appRoot + '/src/schema/relations/' + fileName + '-relations');
			if (obj.foreignKeys) {
				global.foreignKeyCache[tableName] = obj.foreignKeys;
			}
			if (obj.relations) {
				global.relationCache[tableName] = obj.relations;
				return obj.relations;
			}
			return obj;
		} else {
			global.relationCache[tableName] = {};
			return global.relationCache[tableName];
		}
	} catch (e) {
		console.log("Could Not Find Relations for " + tableName);
		return null;
	}
}
