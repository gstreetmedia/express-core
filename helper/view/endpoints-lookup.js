const _ = require("lodash");
const listEnpoints = require("express-list-endpoints");
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

	endPoints.forEach(
		function(item) {
			let path = item.path;
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
					name : path + " [" + item.methods.join(", ").toLowerCase() + "]",
					value : path
				}
			)
		}
	);
	return list;
};