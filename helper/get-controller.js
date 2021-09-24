let inflector = require("./inflector");
let fs = require("fs");
let path = require("path")
global.controllerCache = global.controllerCache || {};

module.exports = (ControllerName) => {

	if (global.controllerCache[ControllerName]) {
		return global.controllerCache[ControllerName];
	}

	if (fs.existsSync(global.appRoot + '/src/controller/' + ControllerName + ".js")) {
		console.log("getting controller => " + global.appRoot + '/src/controller/' + ControllerName)
		global.controllerCache[ControllerName] = require(global.appRoot + '/src/controller/' + ControllerName);
	} else if (fs.existsSync(__dirname + "/../controller/" + ControllerName + ".js")) {
		console.log("getting controller => " + __dirname + "/../controller/" + ControllerName)
		global.controllerCache[ControllerName] = require(__dirname + "/../controller/" + ControllerName);
	}
	return global.controllerCache[ControllerName];
	throw new Error("Cannot find controller for " + ControllerName);
}
