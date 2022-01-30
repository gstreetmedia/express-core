const inflectFromTable = require("../../helper/inflect-from-table");
const inflector = require("../../helper/inflector");
module.exports = (routers) => {

return `class AppRouter {
	/**
	 * Add or remove routes as needed
	 */
	get routeMap() {
		return {
${routers.map((obj) => {
	let tableName = inflector.dasherize(obj.tableName);
	if (tableName.indexOf("-") === 0) {
		tableName = "_" + tableName.substring(1, tableName.length);
	}
return `        "${obj.route || inflectFromTable.route(obj.tableName)}" : "${tableName}-router"`
}).join(",\n")}
		}
	}

	get router() {
		if (!this._router) {
			this.defineRoutes();
		}
		return this._router;
	}

	defineRoutes() {
		this._router = require('express').Router();
		let context = this;
		Object.keys(this.routeMap).forEach(
			(key) => {
				const handler = require("./" + context.routeMap[key]);
				const route = "/" + key;
				context._router.use(route, handler);
			}
		);
	}
}

module.exports = new AppRouter();`;
}
