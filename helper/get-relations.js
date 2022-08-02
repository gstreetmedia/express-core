let inflector = require("./inflector");
let path = require("path");
let fs = require("fs");
const checkRequire = require("./check-require");
let exists = {};
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
	let coreFileName = fileName.indexOf("_") === -1 ? "_" + fileName : fileName;

	let paths = [
		path.resolve(global.appRoot + '/src/schema/relations/' + fileName  + '-relations.js'),
		path.resolve(__dirname + '/../schema/relations/' + coreFileName + '-relations.js'),
	]

	while(paths.length > 0) {
		let o = checkRequire(paths[0]);
		if (o) {
			global.relationCache[tableName] = o.relations || {};
			global.foreignKeyCache[tableName] = o.foreignKeys || {};
			return global.relationCache[tableName];
		}

		paths.shift();
	}

	global.relationCache[tableName] = global.relationCache[tableName] || {};

}
