let inflector = require("./inflector");
const fs = require("fs");
let path = require("path");
const checkRequire = require("./check-require");

module.exports = (controllerOrTableName) => {
	if (controllerOrTableName.indexOf("Controller") === -1) {
		controllerOrTableName = inflector.classify(controllerOrTableName) + "Controller";
	}

	let paths = [
		path.resolve(global.appRoot + '/src/controller/' + controllerOrTableName + ".js"),
		path.resolve(__dirname + '/../controller/' + controllerOrTableName + ".js"),
	];

	while(paths.length > 0) {
		let o = checkRequire(paths[0]);
		if (o) {
			return o;
		}
		paths.shift();
	}

	return null;
}
