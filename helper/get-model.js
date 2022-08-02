let inflector = require("./inflector");
let fs = require("fs");
const checkRequire = require("./check-require");

/**
 * @param modelOrTableName
 * @returns {ModelBase}
 */
module.exports = (modelOrTableName) => {
	if (modelOrTableName.indexOf("Model") === -1) {
		modelOrTableName = inflector.classify(modelOrTableName) + "Model";
	}
	let paths = [
		global.appRoot + '/src/model/' + modelOrTableName + ".js",
		__dirname + '/../model/' + modelOrTableName + ".js",
	];

	let Model;

	while(paths.length > 0) {
		let o = checkRequire(paths[0]);
		if (o) {
			return o;
		}
		paths.shift();
	}

	return Model || null;
}
