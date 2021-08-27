let inflector = require("./inflector");
let path = require("path");
let fs = require("fs");

module.exports = async(tableName, model) => {
	if (global.relationCache && global.relationCache[tableName]) {
		return global.relationCache[tableName];
	}
	if (model.relations) {
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
		return null;
	}
}
