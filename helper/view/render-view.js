const _ = require("lodash");
const fs = require("fs");
const util = require("util");

/**
 * @param {function|string|Promise} viewOrPath
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (viewOrPath, o) => {
	let view;
	let html = "";
	if (typeof viewOrPath === "string") {
		html += `<!-- ${view} -->\n`;
		view = require(view);
	} else {
		view = viewOrPath;
	}
	if (util.types.isAsyncFunction(view)) {
		html += await view(o);
	} else {
		html += view(o);
	}
	return html;
}
