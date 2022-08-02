const _ = require("lodash");
const inflector = require("../helper/inflector");
const inflectFromRoute = require('../helper/inflect-from-route');
const beautify = require("json-beautify");

class RoleManager {

	/**
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {function} next
	 */
	constructor(req) {
		this.req = req;
		this.debug = process.env.NODE_ENV !== "production";
	}

	get method() {
		return this.req.method;
	}

	get params() {
		return this.req.params;
	}

	get body() {
		return this.req.body;
	}

	get originalUrl() {
		return this.req.originalUrl;
	}

	get route() {
		return this.req.route;
	}

	get requestPath() {
		return this.originalUrl.replace(/\?.*$/, '');
	}

	get endPointBase() {
		return this.requestPath.split("/")[1];
	}

	get currentRoute() {
		if (this.route && this.route.path) {
			return this.endPointBase + (this.route.path !== "/" ? this.route.path : '');
		}
		return this.req.originalUrl;
	}

	get allowedRoles() {
		if (!this._allowedRoles) {
			this._allowedRoles = ['super-admin','super-api'];
		}

		return this._allowedRoles;
	}

	get currentRoles() {
		if (!this._currentRoles) {
			this._currentRoles = ['guest'];
		}
		return this._currentRoles;
	}

	get rolePermissions() {
		if (!this._rolePermissions) {
			this._rolePermissions = [];
		}
		return this._rolePermissions;
	}

	get permissionHash() {
		if (!this._permissionHash) {
			this._permissionHash = {};
		}
		return this._permissionHash;
	}

	/**
	 * Add a current requester role
	 * @param role
	 */
	addRole(role) {
		let context = this;
		if (Array.isArray(role)) {
			role.forEach(
				function (item) {
					context.addRole(item);
				}
			)
		} else if (typeof role === "object") {
			this.addRole(role.name);
			this.addPermissions(role);
		} else if (!this.currentRoles.includes(role)) {
			this.log("addRole", role);
			this.currentRoles.push(role);
		} else {
			this.log("addRole", "Already has role " + role);
		}
	};

	/**
	 * Allow a role for the current request
	 * @param role
	 */
	allowRole(role) {

		if (_.isString(role)) {
			if (!this.allowedRoles.includes(role)) {
				this.allowedRoles.push(role);
			}
		} else if (Array.isArray(role)) {
			let context = this;
			role.forEach(
				function(item) {
					context.allowRole(item);
				}
			)
		}
	};
	/**
	 * Remove a current requester role
	 * @param role
	 */
	removeRole(role) {
		let index = _.indexOf(this.currentRoles, role);
		if (index !== -1) {
			this.currentRoles.splice(index, 1);
		}
	};

	/**
	 * Does the current request have the allowed role
	 * @param role
	 * @returns {boolean}
	 */
	hasRole(role) {
		if (!Array.isArray(role)) {
			role = [role];
		}
		this.log("hasRole", "intersection ->" + _.intersection(this.currentRoles, role));
		return _.intersection(this.currentRoles, role).length > 0;
	};

	/**
	 * Add the permissions for a role
	 * @param roles
	 */
	addRolePermissions(roles){
		let context = this;
		roles.forEach(
			function(item) {
				if (item.rolePermissions) {
					context.addPermissions(item.rolePermissions);
				}
				if (item.tokenPermissions) {
					context.addPermissions(item.tokenPermissions);
				}
				if (item.name) {
					context.addRole(item.name);
				}
			}
		)
	}

	/**
	 * Add route, table, object permissions
	 * @param permission
	 */
	addPermissions(permission){
		let context = this;
		if (Array.isArray(permission)) {
			permission.forEach(
				function(item) {
					context.addPermissions(item);
				}
			)
		} else if (!this.permissionHash[permission.id]) {
			this.rolePermissions.push(permission);
			this.log("addPermissions", permission);
			this.permissionHash[permission.id] = true;
		}
	};


	/**
	 * Check the current role is allowed on this request
	 * @param {string} [role] - optional role to allow for this request
	 * @returns {boolean}
	 */
	checkRole(role){

		if (role) {
			this.allowRole(role);
		}

		this.req.locals.notAuthorized = false;

		let currentRoute = this.currentRoute;
		let endPointBase = this.endPointBase;

		this.log("checkRole", "currentRoute => [" + this.method + "] " + this.currentRoute);

		//Role level permissions. If allowRole(SOMEROLE) was used and the current role matches.
		let matchingRoles = _.intersection(this.allowedRoles, this.currentRoles);
		if (matchingRoles.length > 0) {
			this.log("checkRole", "matchingRoles => [" + this.method + "] " + currentRoute + " -> " + matchingRoles);
			return true;
		} else {
			this.log("checkRole", "missingRoles -> " + _.difference(this.allowedRoles, this.currentRoles));
		}

		let className = inflector.camelize(inflector.underscore(endPointBase), true);
		let tableName = inflectFromRoute.table(endPointBase);

		this.log("checkRole", "className => " + className);
		this.log("checkRole", "tableName => " + tableName);

		//see if token has blanket permissions
		let permissions = _.filter(this.rolePermissions, {objectType:"*"});

		if (permissions.length > 0) {
			this.log("checkRole", "* permission => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Route Level Permissions
		let filter = {route:currentRoute};
		permissions = _.filter(
			this.rolePermissions,
			(role) => {
				if (!role.route) {
					return false;
				}
				if (role.route.indexOf(currentRoute) === -1) {
					return false;
				}
				switch (this.method) {
					case "POST" :
						return role.c !== false;
					case "GET" :
						return role.r !== false;
					case "PATCH" :
					case "PUT" :
						return role.u !== false;
					case "DELETE" :
						return role.d !== false;
				}
			}
		);

		if (permissions.length > 0) {
			this.log("checkRole", "routePermissions => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Table Level Permissions
		permissions = _.filter(
			this.rolePermissions,
			(role) => {
				if (tableName === role.objectType) {
					switch (this.method) {
						case "POST" :
							return role.c !== false;
						case "GET" :
							return role.r !== false;
						case "PATCH" :
						case "PUT" :
							return role.u !== false;
						case "DELETE" :
							return role.d !== false;
					}
				}
			}
		);

		if (permissions.length > 0) {
			this.log("checkRole", "tablePermissions => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Object Level Permissions
		if (this.params.id) {
			permissions = _.filter(
				this.rolePermissions,
				(role) => {
					if ([currentRoute,tableName,className].indexOf(role.objectType) !== -1) {
						if (role.objectId === null || role.objectId !== this.params.id) {
							return false;
						}
						switch (this.method) {
							case "POST" :
								return role.c !== false;
							case "GET" :
								return role.r !== false;
							case "PATCH" :
							case "PUT" :
								return role.u !== false;
							case "DELETE" :
								return role.d !== false;
						}
					}
				}
			);
		}

		if (permissions.length > 0) {
			this.log("checkRole", "objectPermissions => [" + this.method + "] " + currentRoute);
			return true;
		}

		if (permissions.length === 0) {
			this.log("checkRole", this.currentRoles.join(",") + " not allowed to route => " + [currentRoute,tableName,className].join(" or "));
			//console.log(req.accountPermissions);
		}

		if (this.req) {
			this.req.locals.notAuthorized = true;
		}

		return false;
	};

	log(method, message) {
		if (this.debug) {
			if (message && typeof message === "object") {
				message = beautify(message);
			}
			console.warn("RoleManager" + (method ? "::" + method : "") + (message ? " -> " + message : ""));
		}
	}
}

module.exports = RoleManager;
