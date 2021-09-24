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

	if (fs.existsSync(global.appRoot + '/src/model/' + ModelName + ".js")) {
		global.modelCache[ModelName] = require(global.appRoot + '/src/model/' + ModelName);
	} else if (fs.existsSync(__dirname + "/../model/" + ModelName + ".js")) {
		global.modelCache[ModelName] = require("../model/" + ModelName);
	}
	return global.modelCache[ModelName];
}
