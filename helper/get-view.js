const _ = require("lodash");
const path = require("path");
const fs = require("fs");
const checkRequire = require("./check-require");
let testPath = path.resolve(global.appRoot + "/src/view");
global.viewPath = path.resolve(fs.existsSync(testPath) ? testPath : testPath + "s");
testPath = path.resolve(__dirname + "/../view");
global.coreViewPath =  path.resolve(fs.existsSync(testPath) ? testPath : testPath + "s");
/**
 * @param {string|array} viewName
 * @returns {Promise<{error: {message: string, views: array, statusCode: integer}}|object>}
 */
module.exports = async (viewName) => {

	if (!Array.isArray(viewName)) {
		viewName = [viewName];
	}

	viewName = _.clone(viewName);

	let views = [];

	while (viewName.length > 0) {
		let paths = [
			path.resolve(`${global.viewPath}/${viewName[0]}.js`),
			path.resolve(`${global.viewPath}/${viewName[0]}/index.js`),
			path.resolve(`${global.coreViewPath}/${viewName[0]}.js`),
			path.resolve(`${global.coreViewPath}/${viewName[0]}/index.js`)
		]
		while (paths.length > 0) {
			if (process.env.NODE_ENV !== "production") {
				console.log(paths[0]);
			}
			let view = checkRequire(paths[0]);
			if (view) {
				return view;
			}
			paths.shift();
		}
		views.push(viewName[0]);
		viewName.shift();
	}

	return {
		error : {
			message : "Path does not exist",
			views : views,
			statusCode : 404
		}
	}
}
