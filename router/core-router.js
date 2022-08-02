const getRouter = require("../helper/get-router");
const fs = require("fs");

class CoreRouter {
	/**
	 * Add or remove routes as needed
	 */
	get routeMap() {
		return {
			"config" : "_config-router",
			"field" : "_fields-router",
			"history" : "_history-router",
			"key-store" : "_key-store-router",
			"log" : "_log-router",
			"role" : "_roles-router",
			"role-permission" : "_role-permissions-router",
			"token" : "_tokens-router",
			"token-permission" : "_token-permissions-router",
			"token-role" : "_token-roles-router",
			"user-permission" : "_user-permissions-router",
			"user-role" : "_user-roles-router",
			"user" : "_users-router",
			"schema" : "_schemas-router",
			"session" : "_sessions-router",
			"cache" : "_cache-router"
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
				const handler = getRouter(context.routeMap[key]);
				if (handler) {
					context._router.use("/" + key, handler);
				} else {
					console.warn("No router found for " + context.routeMap[key]);
				}
			}
		);

	}
}
const cr = new CoreRouter(); //singleton
module.exports = cr;
