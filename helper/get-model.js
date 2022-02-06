let inflector = require("./inflector");
let fs = require("fs");
global.modelCache = global.modelCache || {};
/**
 * @param ModelName
 * @returns {ModelBase}
 */
module.exports = (ModelName) => {
	if (global.modelCache[ModelName]) {
		return global.modelCache[ModelName];
	}

	let paths = [
		global.appRoot + '/src/model/' + ModelName,
		global.appRoot + '/src/core/model/' + ModelName,
	];

	while(paths.length > 0) {
		try {
			global.modelCache[ModelName] = require(paths[0]);
			break;
		} catch (e) {
		}
		paths.shift();
	}

	return global.modelCache[ModelName];
}
