const _ = require("lodash");
const listEnpoints = require("express-list-endpoints");
const inflectFromRoute = require("./inflect-from-route");
const inflectFromTable = require("./inflect-from-table");
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

			if (item.path.indexOf("/admin") !== -1 || item.path === "*" || item.path === '/') {
				return;
			}

			item.parameters = pathToRegexp.parse(item.path);

			if (item.path.indexOf("/") === 0) {
				item.path = item.path.substring(1, item.path.length);
			}

			let apiRoot = global.apiRoot;
			if (global.apiRoot.indexOf("/") === 0) {
				apiRoot = apiRoot.split("/");
				apiRoot.shift();
				apiRoot = apiRoot.join("/");
			}

			item.baseBath = item.path.replace(apiRoot, "").split("/")[0]
			item.table = inflectFromRoute.table(item.baseBath);
			if (item.table !== '') {
				item.controller = inflectFromTable.controllerName(item.table);
				item.model = inflectFromTable.modelName(item.table);
			}

			item.name = item.path + " <span class='text-secondary'>[" + item.methods.join(", ").toLowerCase() + "]</span>";
			list.push(item);
		}
	);

	return list;
};
