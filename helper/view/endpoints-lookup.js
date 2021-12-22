const _ = require("lodash");
const listEnpoints = require("express-list-endpoints");
const inflectFromRoute = require("../inflect-from-route");
const pathToRegexp = require('path-to-regexp');
let list = [];
/**
 * Generates a list of endpoint, name / value pairs for building a select / checkbox form
 * @returns {*}
 */
module.exports = (app) => {

	if (list.length > 0) {
		return list;
	}

	let endPoints;
	if (global.endPoints)  {
		endPoints = _.clone(global.endPoints);
	} else if (app) {
		endPoints = global.endPoints = listEnpoints(app);
	} else {
		return [];
	}

	endPoints.sort(
		(a, b) => {
			return a.path > b.path ? 1 : a.path < b.path ? -1 : 0;
		}
	)

	endPoints.forEach(
		function(item) {
			let path = item.path;
			let parameters = pathToRegexp.parse(item.path);
			if (item.path.indexOf("/") === 0) {
				path = item.path.split("/");
				path.shift();
				path = path.join("/");
				if (path === "") {
					return;
				}
			}

			list.push(
				{
					name : path + " <span class='text-secondary'>[" + item.methods.join(", ").toLowerCase() + "]</span>",
					path : path,
					methods : item.methods,
					table : inflectFromRoute.table(path),
					parameters : parameters
				}
			)
		}
	);
	return list;
};
