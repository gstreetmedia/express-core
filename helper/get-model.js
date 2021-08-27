let inflector = require("./inflector");
let fs = require("fs");

module.exports = (ModelName) => {
	global.modelCache = global.modelCache || {};
	if (global.modelCache[ModelName]) {
		return global.modelCache[ModelName];
	}

	try {
		return require(global.appRoot + '/src/model/' + ModelName);
	} catch (e) {
		return null;
	}
}
