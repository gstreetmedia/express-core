const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const exists = require('util').promisify(fs.exists);
let viewCache = {};

/**
 *
 * @param {string|array} viewName
 * @returns {Promise<{error: {message: string}}|*>}
 */
module.exports = async (viewName) => {
	if (!_.isArray(viewName)) {
		viewName = [viewName];
	}
	//console.log(viewName);

	while (viewName.length > 0) {
		let targetView = viewName[0];
		if (viewCache[targetView]) {
			return viewCache[targetView];
		}
		if (await exists(global.appRoot + "/src/views/" + targetView + ".js")) {
			//console.log("app view");
			let p = global.appRoot + "/src/views/" + targetView;
			//console.log(p);
			delete require.cache[p];
			let v = require(p);
			viewCache[v] = v;
			return v;
		} else if (await exists(path.resolve(__dirname + "/../../views/" + targetView + ".js"))) {
			//console.log("core view");
			let p = path.resolve(__dirname + "/../../views/" + targetView);
			//console.log(p);
			delete require.cache[p];
			let v = require(p);
			viewCache[v] = v;
			return v;
		}
		viewName.shift();
	}
	return {
		error : {
			message : "Path does not exist"
		}
	}

}
