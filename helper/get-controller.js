let inflector = require("./inflector");
let fs = require("fs");
let path = require("path")
global.controllerCache = global.controllerCache || {};

module.exports = (ControllerName) => {

	if (global.controllerCache[ControllerName]) {
		return global.controllerCache[ControllerName];
	}

	let paths = [
		global.appRoot + '/src/controller/' + ControllerName,
		global.appRoot + '/src/core/controller/' + ControllerName,
	];

	while(paths.length > 0) {
		try {
			global.controllerCache[ControllerName] = require(paths[0]);
			break;
		} catch (e) {
		}
		paths.shift();
	}

	return global.controllerCache[ControllerName];
}
